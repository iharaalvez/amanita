from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import GameDexEntry, LivingDexEntry

router = APIRouter()

GAME_LIST = [
    {"id": "red-blue", "name": "Red / Blue", "generation": 1, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "yellow", "name": "Yellow", "generation": 1, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "gold-silver", "name": "Gold / Silver", "generation": 2, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "crystal", "name": "Crystal", "generation": 2, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "ruby-sapphire", "name": "Ruby / Sapphire", "generation": 3, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "emerald", "name": "Emerald", "generation": 3, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "firered-leafgreen", "name": "FireRed / LeafGreen", "generation": 3, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "diamond-pearl", "name": "Diamond / Pearl", "generation": 4, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "platinum", "name": "Platinum", "generation": 4, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "heartgold-soulsilver", "name": "HeartGold / SoulSilver", "generation": 4, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "black-white", "name": "Black / White", "generation": 5, "hasShinyCharm": False, "pokeapiReady": True},
    {"id": "black2-white2", "name": "Black 2 / White 2", "generation": 5, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "x-y", "name": "X / Y", "generation": 6, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "oras", "name": "Omega Ruby / Alpha Sapphire", "generation": 6, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "sun-moon", "name": "Sun / Moon", "generation": 7, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "usum", "name": "Ultra Sun / Ultra Moon", "generation": 7, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "swsh", "name": "Sword / Shield", "generation": 8, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "bdsp", "name": "Brilliant Diamond / Shining Pearl", "generation": 8, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "pla", "name": "Legends: Arceus", "generation": 8, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "scarlet-violet", "name": "Scarlet / Violet", "generation": 9, "hasShinyCharm": True, "pokeapiReady": True},
    {"id": "legends-za", "name": "Legends: Z-A", "generation": 9, "hasShinyCharm": True, "pokeapiReady": False},
]

MYTHICAL_IDS = {
    151, 251, 385, 386, 489, 490, 491, 492, 493, 494,
    647, 648, 649, 719, 720, 721, 801, 802, 807, 808,
    809, 893, 1025,
}

NATIONAL_DEX_MAX_BY_GAME = {
    "red-blue": 151,
    "yellow": 151,
    "gold-silver": 251,
    "crystal": 251,
    "ruby-sapphire": 386,
    "emerald": 386,
    "firered-leafgreen": 386,
    "diamond-pearl": 493,
    "platinum": 493,
    "heartgold-soulsilver": 493,
    "black-white": 649,
    "black2-white2": 649,
    "x-y": 721,
    "oras": 721,
    "bdsp": 493,
}

SHINY_CHARM_GAMES = {game["id"] for game in GAME_LIST if game["hasShinyCharm"]}


@router.get("/games")
def get_games():
    return GAME_LIST


@router.get("/games/{game_id}/dex")
def get_game_dex(game_id: str, db: Session = Depends(get_db)):
    max_species_id = NATIONAL_DEX_MAX_BY_GAME.get(game_id)

    if max_species_id is not None:
        query = (
            db.query(LivingDexEntry)
            .filter(LivingDexEntry.form_name.is_(None))
            .filter(LivingDexEntry.species_id <= max_species_id)
        )
        if game_id in SHINY_CHARM_GAMES:
            query = query.filter(~LivingDexEntry.species_id.in_(MYTHICAL_IDS))

        rows = query.order_by(LivingDexEntry.species_id).all()
        entries = [
            {
                "species_id": row.species_id,
                "entry_number": row.species_id,
                "form_name": None,
                "display_name": row.display_name,
                "sprite_url": row.sprite_url,
            }
            for row in rows
        ]
        return {"game_id": game_id, "entries": entries}

    rows = (
        db.query(GameDexEntry, LivingDexEntry)
        .join(
            LivingDexEntry,
            (LivingDexEntry.species_id == GameDexEntry.species_id)
            & (
                ((GameDexEntry.form_name == "") & LivingDexEntry.form_name.is_(None))
                | (LivingDexEntry.form_name == GameDexEntry.form_name)
            ),
        )
        .filter(GameDexEntry.game_id == game_id)
        .order_by(GameDexEntry.entry_number, GameDexEntry.species_id, GameDexEntry.form_name.desc())
        .all()
    )

    by_species = {}
    for gde, lde in rows:
        if game_id in SHINY_CHARM_GAMES and gde.species_id in MYTHICAL_IDS:
            continue
        current = by_species.get(gde.species_id)
        if current is None or gde.form_name:
            by_species[gde.species_id] = {
                "species_id": gde.species_id,
                "entry_number": gde.entry_number or gde.species_id,
                "form_name": gde.form_name if gde.form_name != "" else None,
                "display_name": lde.display_name,
                "sprite_url": lde.sprite_url,
            }

    entries = sorted(by_species.values(), key=lambda entry: (entry["entry_number"], entry["species_id"]))
    return {"game_id": game_id, "entries": entries}
