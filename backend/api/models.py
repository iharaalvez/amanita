from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey, Index, JSON
from database import Base


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

    __table_args__ = (
        Index("ix_living_dex_entries_species_id", "species_id"),
    )


class GameDexEntry(Base):
    __tablename__ = "game_dex_entries"

    # form_name uses '' as sentinel for the base form to satisfy the composite PK
    # constraint (PostgreSQL primary keys cannot contain NULL).
    game_id = Column(Text, primary_key=True)
    species_id = Column(Integer, ForeignKey("species.id"), primary_key=True)
    form_name = Column(Text, primary_key=True, nullable=False, default="")
    entry_number = Column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_game_dex_entries_game_id", "game_id"),
    )


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


class UserProgress(Base):
    __tablename__ = "user_progress"

    profile_id = Column(Text, primary_key=True, default="local")
    owned = Column(JSON, nullable=False, default=dict)
    game_dex_progress = Column(JSON, nullable=False, default=dict)
    available_games = Column(JSON, nullable=False, default=dict)
