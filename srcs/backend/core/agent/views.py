"""
Agent Views — Smart Savings Calendar
======================================
Django REST Framework views that power the Smart Savings Calendar AI layer.

Endpoints (all mounted under /api/agent/):
    POST /api/agent/savings-calendar/
        Body: { "contract_id": "LAN..." }
        Returns: balance + 7-day AI forecast + savings advice

    GET  /api/agent/health/
        Quick liveness check for the agent service.
"""

from __future__ import annotations

import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from .parser import fetch_wallet_data
from .gemini_service import generate_savings_forecast

logger = logging.getLogger(__name__)

# ── Internal API base URL (docker service name or localhost) ───────────────────
# Reads from settings; falls back to the docker-compose service name.
import os
_WALLET_API_BASE = os.getenv("WALLET_API_BASE", "http://backend:8000")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/agent/savings-calendar/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
def savings_calendar(request: Request) -> Response:

    # ── Validate input ─────────────────────────────────────────────────────
    contract_id: str = request.data.get("contract_id", "").strip()
    if not contract_id:
        return Response(
            {"status": "error", "message": "contract_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.info("[savings_calendar] Request for contract_id=%s", contract_id)

    # ── 1. Data ingestion & parsing ────────────────────────────────────────
    try:
        wallet_data = fetch_wallet_data(
            contract_id=contract_id,
            base_url=_WALLET_API_BASE,
        )
    except Exception as exc:
        logger.exception("[savings_calendar] Parser crashed: %s", exc)
        return Response(
            {"status": "error", "message": f"Data ingestion failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # ── 2. Gemini AI forecast ──────────────────────────────────────────────
    try:
        ai_response = generate_savings_forecast(wallet_data)
    except RuntimeError as exc:
        logger.error("[savings_calendar] Gemini service error: %s", exc)
        return Response(
            {"status": "error", "message": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.exception("[savings_calendar] Unexpected AI error: %s", exc)
        return Response(
            {"status": "error", "message": f"AI layer error: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── 3. Compose final response ──────────────────────────────────────────
    payload = {
        "status": "success",
        # ── Raw financial data ───────────────────────────────────────────
        "balance_mad":       wallet_data.balance_mad,
        "financial_summary": wallet_data.summary_stats,
        "upcoming_events":   wallet_data.upcoming_events,
        "top_categories":    wallet_data.top_categories,
        # ── AI output ────────────────────────────────────────────────────
        "ai_forecast": {
            "risk_level":                  ai_response.risk_level,
            "savings_target_per_day_mad":  ai_response.savings_target,
            "key_insights":                ai_response.key_insights,
            "forecast_7_days":             ai_response.forecast_7_days,
        },
        # ── Advice (top-level for easy UI consumption) ───────────────────
        "savings_advice": ai_response.savings_advice,
        # ── Non-fatal data fetch errors ───────────────────────────────────
        "data_errors": wallet_data.errors,
    }

    logger.info(
        "[savings_calendar] OK — balance=%.2f  risk=%s  errors=%d",
        wallet_data.balance_mad,
        ai_response.risk_level,
        len(wallet_data.errors),
    )

    return Response(payload, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/agent/health/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
def agent_health(request: Request) -> Response:
    """
    Liveness probe for the agent service.
    Returns 200 with a simple status payload.
    """
    from google import genai
    import os

    gemini_configured = bool(os.getenv("GEMINI_API_KEY", ""))

    return Response(
        {
            "status":    "ok",
            "service":   "CIH SmartSave — AI Agent",
            "gemini_sdk_version": getattr(genai, "__version__", "unknown"),
            "gemini_key_present": gemini_configured,
        },
        status=status.HTTP_200_OK,
    )
