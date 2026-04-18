"""
MCC Code → Category Mapping
============================
Maps ISO 18245 Merchant Category Codes to human-readable English names.
Covers the most common categories relevant to Moroccan consumer spending.
Unknown codes fall back to "Other / Miscellaneous".
"""

MCC_CATEGORY_MAP: dict[str, str] = {
    # ─── Groceries & Food Retail ───────────────────────────────────────────
    "5411": "Grocery Stores & Supermarkets",
    "5422": "Meat & Poultry Stores",
    "5441": "Candy, Nut & Confectionery",
    "5451": "Dairy Products",
    "5462": "Bakeries",
    "5499": "Misc. Food Stores",
    "5912": "Drug Stores & Pharmacies",

    # ─── Restaurants & Food Service ────────────────────────────────────────
    "5812": "Eating Places & Restaurants",
    "5813": "Drinking Places & Bars",
    "5814": "Fast Food Restaurants",

    # ─── Fuel & Automotive ─────────────────────────────────────────────────
    "5541": "Service Stations / Gas",
    "5542": "Automated Fuel Dispensers",
    "7523": "Parking Lots & Garages",
    "7531": "Auto Body Repair",
    "7549": "Towing Services",
    "5511": "Car Dealers (New)",
    "5521": "Car Dealers (Used)",

    # ─── Transport & Travel ────────────────────────────────────────────────
    "4011": "Railroads",
    "4111": "Local Transit & Commuter",
    "4121": "Taxicabs & Limousines",
    "4131": "Bus Lines",
    "4511": "Airlines",
    "4722": "Travel Agencies",
    "7011": "Hotels & Motels",

    # ─── Utilities & Telecoms ──────────────────────────────────────────────
    "4812": "Telecom / Phone Services",
    "4814": "Telecommunication Services",
    "4900": "Utilities (Electric, Gas…)",

    # ─── Health & Medical ──────────────────────────────────────────────────
    "5122": "Drugs & Drug Proprietaries",
    "8011": "Doctors & Physicians",
    "8021": "Dentists",
    "8049": "Chiropractors & Therapists",
    "8062": "Hospitals",
    "8099": "Medical Services",

    # ─── Education ─────────────────────────────────────────────────────────
    "8211": "Schools & Elementary",
    "8220": "Colleges & Universities",
    "8299": "School & Educational",

    # ─── Entertainment & Recreation ────────────────────────────────────────
    "7832": "Motion Picture Theaters",
    "7941": "Sports Clubs / Stadiums",
    "7992": "Golf Courses",
    "7993": "Video Games & Arcades",
    "7999": "Recreation Services",

    # ─── Shopping & Retail ─────────────────────────────────────────────────
    "5300": "Wholesale Clubs",
    "5310": "Discount Stores",
    "5311": "Department Stores",
    "5331": "Variety Stores",
    "5399": "Misc. General Merchandise",
    "5600": "Clothing Stores",
    "5621": "Ladies' Clothing",
    "5631": "Ladies' Accessories",
    "5651": "Family Clothing",
    "5661": "Shoe Stores",
    "5691": "Men's/Women's Clothing",
    "5712": "Furniture Stores",
    "5732": "Electronics Stores",
    "5734": "Computer Stores",
    "5944": "Jewelry Stores",
    "5945": "Hobby & Toy Stores",
    "5999": "Misc. Retail Stores",

    # ─── Financial & Insurance ─────────────────────────────────────────────
    "6010": "Financial Institutions (Cash)",
    "6011": "ATM Withdrawals",
    "6012": "Banks",
    "6051": "Currency Exchange",
    "6300": "Insurance",

    # ─── Professional & Business ───────────────────────────────────────────
    "7372": "IT Services",
    "7374": "Data Processing",
    "8000": "Health & Education Misc.",
    "8742": "Management Consulting",

    # ─── Home & Real Estate ────────────────────────────────────────────────
    "5251": "Hardware Stores",
    "5261": "Lawn & Garden",
    "1711": "Plumbing & AC",
    "1731": "Electrical Work",
    "1750": "Carpentry",
    "4816": "Computer Network Services",

    # ─── Wallet / Mobile ───────────────────────────────────────────────────
    "6536": "Mobile Wallet Payments",
    "6537": "Mobile Wallet Transfer",
}


def get_category(mcc_code: str) -> str:
    """
    Return english_category for a given MCC code.
    Falls back gracefully for unknown codes.
    """
    return MCC_CATEGORY_MAP.get(str(mcc_code).strip(), "Other / Miscellaneous")


def get_all_categories() -> list[str]:
    """Return a sorted list of all unique English category names."""
    return sorted(set(MCC_CATEGORY_MAP.values()))
