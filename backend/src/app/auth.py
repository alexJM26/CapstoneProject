import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

#environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qguuhcavrukdmprrtxik.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndXVoY2F2cnVrZG1wcnJ0eGlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc0ODE2MywiZXhwIjoyMDc0MzI0MTYzfQ.66TMQpNuxqcipl0otjnETXijDmbHq1r-0EuTAR4g8gw")  #need the SERVICE KEY, not anon key

#initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Verify the JWT token and return the user ID.
    """
    try:
        #get token from Authorization header
        token = credentials.credentials
        
        #verify token with Supabase
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        return user.user.id
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str | None:
    """
    Optional authentication - returns user ID if authenticated, None otherwise.
    """
    try:
        if not credentials:
            return None
        return await get_current_user(credentials)
    except:
        return None