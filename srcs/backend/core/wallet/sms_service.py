import os
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

def send_otp_sms(phone_number: str, otp_code: str, action_type: str = "activation") -> bool:
    """
    Sends an OTP via SMS. Formatted to support WebOTP API and Android SMS Retriever.
    Reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER from env.
    Falls back to a console print if credentials are missing.
    """
    domain = os.environ.get('APP_DOMAIN', 'cih-wallet.local')
    # The message includes standard formats for auto-detection:
    # "@domain #123456" for WebOTP
    # "<#> ... [AppHash]" for Android
    message_body = (
        f"<#> Your CIH Wallet {action_type} code is: {otp_code}\n\n"
        f"@{domain} #{otp_code}"
    )

    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_phone = os.environ.get('TWILIO_PHONE_NUMBER')

    if not all([account_sid, auth_token, from_phone]):
        # Mock / Fallback mode
        print("\n" + "="*50)
        print("📲 MOCK SMS SENT")
        print(f"To: {phone_number}")
        print(f"Message:\n{message_body}")
        print("="*50 + "\n")
        return True

    try:
        # Standardize phone number format (assuming Morocco country code +212 if not provided cleanly)
        clean_phone = phone_number.strip()
        if not clean_phone.startswith('+'):
            if clean_phone.startswith('0'):
                clean_phone = '+212' + clean_phone[1:]
            elif clean_phone.startswith('212'):
                clean_phone = '+' + clean_phone
            else:
                clean_phone = '+212' + clean_phone
        
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=message_body,
            from_=from_phone,
            to=clean_phone
        )
        logger.info(f"SMS correctly sent to {clean_phone}: SID {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Failed to send SMS to {phone_number}: {e}")
        # Even if Twilio fails, we return False to let the caller handle it.
        return False
    except Exception as e:
        logger.error(f"Unknown error sending SMS: {e}")
        return False
