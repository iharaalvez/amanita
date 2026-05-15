"""Living Dex form filtering ported from src/lib/forms.ts."""

REGIONAL_KEYWORDS = ("alola", "galar", "hisui", "paldea")

EXCLUDED_KEYWORDS = (
    "mega",
    "gmax",
    "primal",
    "eternamax",
    "totem",
    "battle-bond",
    "power-construct",
    "busted",
    "school",
)

FORM_LABEL: dict[str, str] = {
    "alola": "Alolan",
    "galar": "Galarian",
    "hisui": "Hisuian",
    "paldea": "Paldean",
}

GAME_REGION: dict[str, str | None] = {
    "red-blue": None,
    "yellow": None,
    "gold-silver": None,
    "crystal": None,
    "ruby-sapphire": None,
    "emerald": None,
    "firered-leafgreen": None,
    "diamond-pearl": None,
    "platinum": None,
    "heartgold-soulsilver": None,
    "black-white": None,
    "black2-white2": None,
    "x-y": None,
    "oras": None,
    "sun-moon": "alola",
    "usum": "alola",
    "lgpe": None,
    "swsh": "galar",
    "bdsp": None,
    "pla": "hisui",
    "scarlet-violet": "paldea",
    "legends-za": None,
}

HARDCODED_EXTRA_FORMS: list[str] = [
    "slowpoke",
    "linoone",
    "corsola",
    "yamask",
    "farfetchd",
    "sneasel",
    "qwilfish",
    "basculin",
    "stantler",
    "primeape",
]


def isLivingDexForm(variety_name: str) -> bool:
    lower = variety_name.lower()
    if any(keyword in lower for keyword in EXCLUDED_KEYWORDS):
        return False
    return any(keyword in lower for keyword in REGIONAL_KEYWORDS)


def get_form_label(variety_name: str) -> str | None:
    lower = variety_name.lower()
    for keyword in REGIONAL_KEYWORDS:
        if keyword in lower:
            return FORM_LABEL[keyword]
    return None
