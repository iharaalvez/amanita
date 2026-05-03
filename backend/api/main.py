from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import LivingDexEntry
from routers import entries, games, encounters, pokemon, progress

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Living Pokédex API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(encounters.router, prefix="/api")
app.include_router(pokemon.router, prefix="/api")
app.include_router(progress.router, prefix="/api")


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    seeded = db.query(LivingDexEntry).first() is not None
    return {"status": "ok", "seeded": seeded}
