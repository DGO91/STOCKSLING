import asyncio
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal, engine
from backend.app.models import User, UserPlan, UserRank
from backend.app.auth import get_password_hash

async def create_or_update_dev_user():
    email = "dev@example.com"
    password = "demo-password"
    hashed_pwd = get_password_hash(password)

    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).filter(User.email == email))
        user = result.scalars().first()

        if user:
            print(f"User {email} already exists, updating password and credits...")
            user.hashed_password = hashed_pwd
            user.credits = 10000
            user.plan = UserPlan.PRO
            user.rank = UserRank.COLLABORATOR
        else:
            print(f"Creating user {email}...")
            user = User(
                email=email,
                hashed_password=hashed_pwd,
                credits=10000,
                plan=UserPlan.PRO,
                rank=UserRank.COLLABORATOR,
                referral_code="DEV_DIOGENES"
            )
            session.add(user)
        
        await session.commit()
        print(f"Successfully configured developer user {email}!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_or_update_dev_user())
