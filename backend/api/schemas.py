from pydantic import BaseModel
from typing import Optional, Any


class SpeciesSchema(BaseModel):
    id: int
    name: str
    generation: int

    model_config = {"from_attributes": True}


class LivingDexEntrySchema(BaseModel):
    id: int
    species_id: int
    form_name: Optional[str]
    display_name: str
    sprite_url: str
    shiny_sprite_url: str
    is_regional_form: bool
    region_label: Optional[str]
    sort_order: int

    model_config = {"from_attributes": True}


class GameDexEntrySchema(BaseModel):
    species_id: int
    form_name: Optional[str]
    display_name: str
    sprite_url: str


class UserProgressSchema(BaseModel):
    owned: dict[str, Any]
    game_dex_progress: dict[str, list[int]]
    available_games: dict[str, bool]
