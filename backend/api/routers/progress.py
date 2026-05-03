from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import UserProgress
from schemas import UserProgressSchema

router = APIRouter()

PROFILE_ID = "local"


@router.get("/progress", response_model=UserProgressSchema)
def get_progress(db: Session = Depends(get_db)):
    progress = db.query(UserProgress).filter(UserProgress.profile_id == PROFILE_ID).first()
    if progress is None:
        return {
            "owned": {},
            "game_dex_progress": {},
            "available_games": {},
        }

    return {
        "owned": progress.owned or {},
        "game_dex_progress": progress.game_dex_progress or {},
        "available_games": progress.available_games or {},
    }


@router.put("/progress", response_model=UserProgressSchema)
def save_progress(payload: UserProgressSchema, db: Session = Depends(get_db)):
    progress = db.query(UserProgress).filter(UserProgress.profile_id == PROFILE_ID).first()
    if progress is None:
        progress = UserProgress(profile_id=PROFILE_ID)
        db.add(progress)

    progress.owned = payload.owned
    progress.game_dex_progress = payload.game_dex_progress
    progress.available_games = payload.available_games
    db.commit()
    db.refresh(progress)

    return {
        "owned": progress.owned or {},
        "game_dex_progress": progress.game_dex_progress or {},
        "available_games": progress.available_games or {},
    }
