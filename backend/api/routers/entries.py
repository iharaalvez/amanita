from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import LivingDexEntry
from schemas import LivingDexEntrySchema

router = APIRouter()


@router.get("/living-dex-entries")
def get_all_entries(db: Session = Depends(get_db)):
    entries = db.query(LivingDexEntry).order_by(LivingDexEntry.sort_order).all()
    return {
        "entries": [LivingDexEntrySchema.model_validate(e) for e in entries],
        "total": len(entries),
    }


@router.get("/living-dex-entries/{species_id}")
def get_species_entries(species_id: int, db: Session = Depends(get_db)):
    entries = (
        db.query(LivingDexEntry)
        .filter(LivingDexEntry.species_id == species_id)
        .order_by(LivingDexEntry.sort_order)
        .all()
    )
    return {
        "entries": [LivingDexEntrySchema.model_validate(e) for e in entries],
        "total": len(entries),
    }
