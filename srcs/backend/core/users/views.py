from django.shortcuts import render
from rest_framework import response, status, decorators
from django.http import HttpResponse
from datetime import datetime

def checkHealth(req):
    if req.method == "GET":
        now = datetime.now().strftime("%A, %d %B %Y - %H:%M:%S")
        return HttpResponse(f"""
            <div style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h1>Welcome to Cyclops</h1>
                <p style="font-size: 18px; color: #555;">
                    Current time: {now}
                </p>
            </div>
        """)
    