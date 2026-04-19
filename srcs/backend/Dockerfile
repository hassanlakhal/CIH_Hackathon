FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip
RUN pip install django
RUN pip install requests
RUN pip install dotenv
RUN pip install django_rest_framework
RUN pip install django-cors-headers
RUN pip install google-generativeai

WORKDIR /cyclops
COPY ./core .
COPY ./deploy/run.sh .
RUN chmod +x run.sh

CMD ["./run.sh"]