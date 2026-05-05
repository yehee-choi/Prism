from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import upload, stock, analyze, insight, dart

load_dotenv()

app = FastAPI(title="Prism API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(stock.router)
app.include_router(analyze.router)
app.include_router(insight.router)
app.include_router(dart.router)

@app.get("/")
def root():
    return {"message": "Prism API is running"}
