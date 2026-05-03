from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Encounter

router = APIRouter()


@router.get("/encounters/{species_id}")
def get_encounters(species_id: int, db: Session = Depends(get_db)):
    rows = db.query(Encounter).filter(Encounter.species_id == species_id).all()
    result: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        result[row.game_id].append(row.location_name)
    return dict(result)
