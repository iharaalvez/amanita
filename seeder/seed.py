"""Populate the Living Pokedex database from PokeAPI."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from collections import defaultdict
from typing import Any

import httpx
from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, JSON, Text, create_engine, func, text
from sqlalchemy.orm import declarative_base, sessionmaker
from tqdm import tqdm

from forms import GAME_REGION, get_form_label, isLivingDexForm
from game_list import GAME_LIST

DATABASE_URL = os.environ["DATABASE_URL"]
POKEAPI_BASE = os.environ.get("POKEAPI_BASE", "https://pokeapi.co/api/v2").rstrip("/")
CONCURRENCY = 20
SPECIES_LIMIT = 1025

Base = declarative_base()
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    generation = Column(Integer, nullable=False)


class LivingDexEntry(Base):
    __tablename__ = "living_dex_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    species_id = Column(Integer, ForeignKey("species.id"), nullable=False)
    form_name = Column(Text, nullable=True)
    display_name = Column(Text, nullable=False)
    sprite_url = Column(Text, nullable=False)
    shiny_sprite_url = Column(Text, nullable=False)
    is_regional_form = Column(Boolean, default=False, nullable=False)
    region_label = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False)
    types = Column(JSON, nullable=False, default=list)
    stats = Column(JSON, nullable=False, default=dict)
    height = Column(Integer, nullable=True)
    weight = Column(Integer, nullable=True)

    __table_args__ = (Index("ix_living_dex_entries_species_id", "species_id"),)


class GameDexEntry(Base):
    __tablename__ = "game_dex_entries"

    game_id = Column(Text, primary_key=True)
    species_id = Column(Integer, ForeignKey("species.id"), primary_key=True)
    form_name = Column(Text, primary_key=True, nullable=False, default="")
    entry_number = Column(Integer, nullable=True)

    __table_args__ = (Index("ix_game_dex_entries_game_id", "game_id"),)


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    species_id = Column(Integer, nullable=False)
    form_name = Column(Text, nullable=True)
    game_id = Column(Text, nullable=False)
    location_name = Column(Text, nullable=False)

    __table_args__ = (
        Index("ix_encounters_species_id", "species_id"),
        Index("ix_encounters_game_id", "game_id"),
    )


VERSION_TO_GAME_ID: dict[str, str] = {
    "red": "red-blue",
    "blue": "red-blue",
    "yellow": "yellow",
    "gold": "gold-silver",
    "silver": "gold-silver",
    "crystal": "crystal",
    "ruby": "ruby-sapphire",
    "sapphire": "ruby-sapphire",
    "emerald": "emerald",
    "firered": "firered-leafgreen",
    "leafgreen": "firered-leafgreen",
    "diamond": "diamond-pearl",
    "pearl": "diamond-pearl",
    "platinum": "platinum",
    "heartgold": "heartgold-soulsilver",
    "soulsilver": "heartgold-soulsilver",
    "black": "black-white",
    "white": "black-white",
    "black-2": "black2-white2",
    "white-2": "black2-white2",
    "x": "x-y",
    "y": "x-y",
    "omega-ruby": "oras",
    "alpha-sapphire": "oras",
    "sun": "sun-moon",
    "moon": "sun-moon",
    "ultra-sun": "usum",
    "ultra-moon": "usum",
    "sword": "swsh",
    "shield": "swsh",
    "brilliant-diamond": "bdsp",
    "shining-pearl": "bdsp",
    "legends-arceus": "pla",
    "scarlet": "scarlet-violet",
    "violet": "scarlet-violet",
}


def species_id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1])


def title_case(name: str) -> str:
    return " ".join(word.capitalize() for word in name.split("-"))


def get_generation_from_species_id(species_id: int) -> int:
    if species_id <= 151:
        return 1
    if species_id <= 251:
        return 2
    if species_id <= 386:
        return 3
    if species_id <= 493:
        return 4
    if species_id <= 649:
        return 5
    if species_id <= 721:
        return 6
    if species_id <= 809:
        return 7
    if species_id <= 905:
        return 8
    return 9


def format_location_name(name: str) -> str:
    return title_case(name.replace("-area", ""))


def region_key_from_label(label: str | None) -> str | None:
    if label is None:
        return None
    return label.removesuffix("n").lower()


def display_name_for_form(species_name: str, variety_name: str) -> str:
    label = get_form_label(variety_name)
    return f"{label} {title_case(species_name)}" if label else title_case(species_name)


def pokemon_types(pokemon_data: dict[str, Any]) -> list[str]:
    return [
        slot["type"]["name"]
        for slot in sorted(pokemon_data.get("types", []), key=lambda item: item["slot"])
    ]


def pokemon_stats(pokemon_data: dict[str, Any]) -> dict[str, int]:
    return {
        stat["stat"]["name"]: int(stat["base_stat"])
        for stat in pokemon_data.get("stats", [])
    }


async def fetch_json(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    path: str,
) -> Any:
    async with semaphore:
        response = await client.get(f"{POKEAPI_BASE}{path}", timeout=60)
        response.raise_for_status()
        return response.json()


async def gather_with_progress(
    coroutines: list[asyncio.Task],
    description: str,
    unit: str,
) -> list[Any]:
    results: list[Any] = []
    with tqdm(total=len(coroutines), desc=description, unit=unit) as progress:
        for future in asyncio.as_completed(coroutines):
            results.append(await future)
            progress.update(1)
    return results


def truncate_tables() -> None:
    with Session() as db:
        db.query(Encounter).delete()
        db.query(GameDexEntry).delete()
        db.query(LivingDexEntry).delete()
        db.query(Species).delete()
        db.execute(text("ALTER SEQUENCE IF EXISTS living_dex_entries_id_seq RESTART WITH 1"))
        db.execute(text("ALTER SEQUENCE IF EXISTS encounters_id_seq RESTART WITH 1"))
        db.commit()


def ensure_schema() -> None:
    Base.metadata.create_all(engine)
    with Session() as db:
        db.execute(text("ALTER TABLE living_dex_entries ADD COLUMN IF NOT EXISTS types JSONB NOT NULL DEFAULT '[]'::jsonb"))
        db.execute(text("ALTER TABLE living_dex_entries ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb"))
        db.execute(text("ALTER TABLE living_dex_entries ADD COLUMN IF NOT EXISTS height INTEGER"))
        db.execute(text("ALTER TABLE living_dex_entries ADD COLUMN IF NOT EXISTS weight INTEGER"))
        db.execute(text("ALTER TABLE game_dex_entries ADD COLUMN IF NOT EXISTS entry_number INTEGER"))
        db.commit()


def safety_check(force: bool) -> None:
    ensure_schema()
    with Session() as db:
        existing_entries = db.query(LivingDexEntry).count()
    if existing_entries and not force:
        print("Database already seeded. Use --force to reseed.")
        sys.exit(0)
    if force:
        print("--force: truncating and reseeding.")
        truncate_tables()


async def seed_species(client: httpx.AsyncClient, semaphore: asyncio.Semaphore) -> list[dict[str, str]]:
    print("Step 1 - Seeding species...")
    data = await fetch_json(client, semaphore, f"/pokemon?limit={SPECIES_LIMIT}&offset=0")
    pokemon_list = data["results"]

    with Session() as db:
        for item in tqdm(pokemon_list, desc="Seeding species", unit="species"):
            species_id = species_id_from_url(item["url"])
            db.merge(
                Species(
                    id=species_id,
                    name=item["name"],
                    generation=get_generation_from_species_id(species_id),
                )
            )
        db.commit()

    return pokemon_list


async def seed_living_dex_entries(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    pokemon_list: list[dict[str, str]],
) -> dict[int, list[str]]:
    print("Step 2 - Seeding entries...")

    async def fetch_species(species_id: int) -> tuple[int, dict[str, Any]]:
        data = await fetch_json(client, semaphore, f"/pokemon-species/{species_id}")
        return species_id, data

    species_tasks = [
        asyncio.create_task(fetch_species(species_id_from_url(item["url"])))
        for item in pokemon_list
    ]
    species_results = await gather_with_progress(species_tasks, "Seeding entries", "species")
    species_by_id = dict(species_results)

    base_varieties: dict[int, str] = {}
    regional_varieties: list[tuple[int, str, str | None]] = []
    regional_forms_by_species: dict[int, list[str]] = defaultdict(list)

    for species_id in sorted(species_by_id):
        species_data = species_by_id[species_id]
        for variety in species_data.get("varieties", []):
            variety_name = variety["pokemon"]["name"]
            if variety["is_default"]:
                base_varieties[species_id] = variety_name
                continue
            if isLivingDexForm(variety_name):
                label = get_form_label(variety_name)
                regional_varieties.append((species_id, variety_name, label))
                regional_forms_by_species[species_id].append(variety_name)

    regional_varieties.sort(key=lambda item: (region_key_from_label(item[2]) or "", item[0], item[1]))
    pokemon_names = [
        *(base_varieties[species_id] for species_id in sorted(base_varieties)),
        *(variety_name for _, variety_name, _ in regional_varieties),
    ]

    async def fetch_pokemon(variety_name: str) -> tuple[str, dict[str, Any]]:
        data = await fetch_json(client, semaphore, f"/pokemon/{variety_name}")
        return variety_name, data

    detail_tasks = [asyncio.create_task(fetch_pokemon(name)) for name in pokemon_names]
    detail_results = await gather_with_progress(detail_tasks, "Fetching entry sprites", "pokemon")
    pokemon_by_name = dict(detail_results)

    with Session() as db:
        sort_order = 1
        for species_id in range(1, SPECIES_LIMIT + 1):
            species_data = species_by_id[species_id]
            variety_name = base_varieties[species_id]
            sprites = pokemon_by_name[variety_name].get("sprites", {})
            db.add(
                LivingDexEntry(
                    species_id=species_id,
                    form_name=None,
                    display_name=title_case(species_data["name"]),
                    sprite_url=sprites.get("front_default") or "",
                    shiny_sprite_url=sprites.get("front_shiny") or "",
                    is_regional_form=False,
                    region_label=None,
                    sort_order=sort_order,
                    types=pokemon_types(pokemon_by_name[variety_name]),
                    stats=pokemon_stats(pokemon_by_name[variety_name]),
                    height=pokemon_by_name[variety_name].get("height"),
                    weight=pokemon_by_name[variety_name].get("weight"),
                )
            )
            sort_order += 1

        for species_id, variety_name, label in regional_varieties:
            species_data = species_by_id[species_id]
            sprites = pokemon_by_name[variety_name].get("sprites", {})
            db.add(
                LivingDexEntry(
                    species_id=species_id,
                    form_name=variety_name,
                    display_name=display_name_for_form(species_data["name"], variety_name),
                    sprite_url=sprites.get("front_default") or "",
                    shiny_sprite_url=sprites.get("front_shiny") or "",
                    is_regional_form=True,
                    region_label=label,
                    sort_order=sort_order,
                    types=pokemon_types(pokemon_by_name[variety_name]),
                    stats=pokemon_stats(pokemon_by_name[variety_name]),
                    height=pokemon_by_name[variety_name].get("height"),
                    weight=pokemon_by_name[variety_name].get("weight"),
                )
            )
            sort_order += 1

        db.commit()

    regional_count = len(regional_varieties)
    print(
        f"Living dex entries: {SPECIES_LIMIT} base + "
        f"{regional_count} regional = {SPECIES_LIMIT + regional_count} total"
    )
    return regional_forms_by_species


async def seed_game_dexes(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    regional_forms_by_species: dict[int, list[str]],
) -> None:
    print("Step 3 - Seeding game dexes...")
    games = [game for game in GAME_LIST if game.get("pokedex_id")]

    async def fetch_pokedex(game: dict[str, object]) -> tuple[dict[str, object], dict[str, Any]]:
        data = await fetch_json(client, semaphore, f"/pokedex/{game['pokedex_id']}")
        return game, data

    tasks = [asyncio.create_task(fetch_pokedex(game)) for game in games]
    results = await gather_with_progress(tasks, "Seeding game dexes", "game")

    with Session() as db:
        db.execute(text("ALTER TABLE game_dex_entries ADD COLUMN IF NOT EXISTS entry_number INTEGER"))
        for game, pokedex_data in results:
            game_id = str(game["id"])
            region = GAME_REGION.get(game_id)
            rows: dict[tuple[str, int, str], int] = {}
            for entry in pokedex_data.get("pokemon_entries", []):
                species_id = species_id_from_url(entry["pokemon_species"]["url"])
                entry_number = int(entry["entry_number"])
                regional_form_name = ""
                if region:
                    regional_form_name = next(
                        (
                            form_name
                            for form_name in regional_forms_by_species.get(species_id, [])
                            if region in form_name
                        ),
                        "",
                    )
                rows[(game_id, species_id, regional_form_name)] = entry_number

            for (row_game_id, species_id, form_name), entry_number in rows.items():
                db.merge(
                    GameDexEntry(
                        game_id=row_game_id,
                        species_id=species_id,
                        form_name=form_name,
                        entry_number=entry_number,
                    )
                )
            db.commit()
            print(f"Seeded {game['name']} dex: {len(rows)} entries")


# Games whose Pokédex data is not yet in PokéAPI are seeded here manually.
# Each entry is a list of species IDs in game Pokédex order.
# Source: Bulbapedia, verified 2026-05-06.
MANUAL_GAME_DEXES: dict[str, list[int]] = {
    "lgpe": [
        *range(1, 152),
        808,
        809,
    ],
    "legends-za": [
        152, 153, 154, 498, 499, 500, 158, 159, 160,
        661, 662, 663, 659, 660, 664, 665, 666,
        13, 14, 15, 16, 17, 18, 179, 180, 181, 504, 505,
        406, 315, 407, 129, 130, 688, 689, 120, 121,
        669, 670, 671, 672, 673, 677, 678, 667, 668,
        674, 675, 568, 569, 702,
        172, 25, 26, 173, 35, 36, 167, 168, 23, 24,
        63, 64, 65, 92, 93, 94, 543, 544, 545,
        679, 680, 681,
        69, 70, 71, 511, 512, 513, 514, 515, 516,
        307, 308, 309, 310, 280, 281, 282, 475,
        228, 229, 333, 334, 531,
        682, 683, 684, 685,
        133, 134, 135, 136, 196, 197, 470, 471, 700,
        427, 428, 353, 354, 582, 583, 584, 322, 323,
        449, 450, 529, 530, 551, 552, 553,
        66, 67, 68, 443, 444, 445, 703, 302, 303, 359, 447, 448,
        79, 80, 199, 318, 319, 602, 603, 604,
        147, 148, 149, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        618, 676, 686, 687, 690, 691, 692, 693, 704, 705, 706,
        225, 361, 362, 478, 459, 460, 712, 713,
        123, 212, 127, 214, 587, 701, 708, 709, 559, 560, 714, 715,
        707, 607, 608, 609,
        142, 696, 697, 698, 699, 95, 208, 304, 305, 306,
        694, 695, 710, 711, 246, 247, 248, 656, 657, 658,
        870, 650, 651, 652, 227, 653, 654, 655,
        371, 372, 373, 115, 780, 374, 375, 376, 377, 378, 379,
        # Optional entries (#231–232): appear in dex but not required for Shiny Charm
        150, 719,
    ],
}


def seed_manual_game_dexes() -> None:
    print("Step 3b - Seeding manual game dexes...")
    with Session() as db:
        for game_id, species_ids in MANUAL_GAME_DEXES.items():
            db.query(GameDexEntry).filter(GameDexEntry.game_id == game_id).delete()
            for entry_number, species_id in enumerate(species_ids, start=1):
                db.add(GameDexEntry(
                    game_id=game_id,
                    species_id=species_id,
                    form_name="",
                    entry_number=entry_number,
                ))
            db.commit()
            print(f"Seeded {game_id} dex: {len(species_ids)} entries")


async def seed_encounters(client: httpx.AsyncClient, semaphore: asyncio.Semaphore) -> None:
    print("Step 4 - Seeding encounters...")

    async def fetch_encounters(species_id: int) -> tuple[int, list[dict[str, Any]]]:
        data = await fetch_json(client, semaphore, f"/pokemon/{species_id}/encounters")
        return species_id, data

    tasks = [
        asyncio.create_task(fetch_encounters(species_id))
        for species_id in range(1, SPECIES_LIMIT + 1)
    ]
    results = await gather_with_progress(tasks, "Seeding encounters", "species")

    rows: set[tuple[int, str, str]] = set()
    for species_id, encounters in results:
        for encounter in encounters:
            location_name = format_location_name(encounter["location_area"]["name"])
            for version_detail in encounter.get("version_details", []):
                version_name = version_detail["version"]["name"]
                game_id = VERSION_TO_GAME_ID.get(version_name)
                if game_id:
                    rows.add((species_id, game_id, location_name))

    with Session() as db:
        for species_id, game_id, location_name in tqdm(rows, desc="Inserting encounters", unit="row"):
            db.add(
                Encounter(
                    species_id=species_id,
                    form_name=None,
                    game_id=game_id,
                    location_name=location_name,
                )
            )
        db.commit()


def print_summary() -> None:
    print("Step 5 - Summary")
    with Session() as db:
        counts = {
            "species": db.query(func.count(Species.id)).scalar(),
            "living_dex_entries": db.query(func.count(LivingDexEntry.id)).scalar(),
            "game_dex_entries": db.query(func.count()).select_from(GameDexEntry).scalar(),
            "encounters": db.query(func.count(Encounter.id)).scalar(),
        }
    for table_name, count in counts.items():
        print(f"{table_name}: {count}")


async def run(force: bool) -> None:
    safety_check(force)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient() as client:
        pokemon_list = await seed_species(client, semaphore)
        regional_forms_by_species = await seed_living_dex_entries(client, semaphore, pokemon_list)
        await seed_game_dexes(client, semaphore, regional_forms_by_species)
        seed_manual_game_dexes()
        await seed_encounters(client, semaphore)
    print_summary()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed the Living Pokedex database.")
    parser.add_argument("--force", action="store_true", help="Truncate all seed tables before seeding.")
    parser.add_argument("--manual-dexes", action="store_true", help="Re-seed only the manually curated game dexes (e.g. Legends: Z-A). Safe to run against a live DB.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.manual_dexes:
        ensure_schema()
        seed_manual_game_dexes()
    else:
        asyncio.run(run(force=args.force))
