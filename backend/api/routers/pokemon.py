from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Species, LivingDexEntry
from schemas import SpeciesSchema, LivingDexEntrySchema

router = APIRouter()


@router.get("/pokemon/{species_id}")
def get_pokemon(species_id: int, db: Session = Depends(get_db)):
    species = db.query(Species).filter(Species.id == species_id).first()
    if not species:
        raise HTTPException(status_code=404, detail="Species not found")
    entries = (
        db.query(LivingDexEntry)
        .filter(LivingDexEntry.species_id == species_id)
        .order_by(LivingDexEntry.sort_order)
        .all()
    )
    return {
        "species": SpeciesSchema.model_validate(species),
        "entries": [LivingDexEntrySchema.model_validate(e) for e in entries],
    }
