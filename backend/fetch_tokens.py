import asyncio
import httpx
import json

async def fetch_tokens():
    url = "https://token.jup.ag/all"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 200:
            all_tokens = response.json()
            
            # List of symbols we want to find
            target_symbols = [
                "TRUMP", "BONK", "PENGU", "PIPPIN", "WIF", "FARTCOIN", "DREAM", "BABYDOGE", 
                "MELANIA", "DOG", "TDCCP", "BAN", "SAD", "POPCAT", "MEW", "LUX", "PNUT", 
                "MOODENG", "USELESS", "BOME", "GIGA", "TROLL", "GOAT", "ACT", "DAKU", 
                "ZEREBRO", "VINE", "AURA", "BERT", "CLASH", "GBACK", "SOSANA", "MCDULL", 
                "BULLISH", "CHILLGUY", "PEPECOIN", "BELIEVE", "NUB", "NOBODY", "MORI", 
                "PURPE", "401JK", "FARTBOY", "UFD", "URANUS", "FWOG", "DADDY", "LC", 
                "CAW", "QUACK", "STNK", "AU79", "FKH", "NEET", "JOBCOIN", "HACHI", 
                "USDUC", "NAP", "GME", "MANEKI", "FIH", "SPSC", "SHOGGOTH", "PAIN", 
                "CHILLHOUSE", "AKIO", "HAROLD", "RETARDIO", "OPUS", "MICHI", "USA", 
                "SIGMA", "SLOTH", "PUNDU", "PP", "MASK", "MINI", "MOTHER", "BUCKY", 
                "V2EX", "CAT", "NOTHING", "EVERY", "KORI", "PANDU", "MOMO", "WHISKEY", 
                "VCC", "GG", "PWEASE", "LOCKIN", "RIZZMAS", "CANDLE", "LMAO"
            ]
            
            found_tokens = {}
            
            for token in all_tokens:
                symbol = token.get("symbol", "").upper()
                if symbol in target_symbols:
                    # Prefer tokens with tags or specific known addresses if duplicates exist
                    # For now, just take the first one or overwrite
                    if symbol not in found_tokens:
                         found_tokens[symbol] = {
                            "address": token.get("address"),
                            "name": token.get("name"),
                            "coingecko_id": token.get("extensions", {}).get("coingeckoId", "")
                        }
            
            # Print in the format we need for the python file
            print("    SOLANA_MEME_TOKENS = {")
            for symbol, data in found_tokens.items():
                print(f'        "{symbol}": {{')
                print(f'            "address": "{data["address"]}",')
                print(f'            "name": "{data["name"]}",')
                print(f'            "coingecko_id": "{data["coingecko_id"]}"')
                print('        },')
            print("    }")

if __name__ == "__main__":
    asyncio.run(fetch_tokens())
