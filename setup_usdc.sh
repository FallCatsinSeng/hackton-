#!/bin/bash
MINT="41YKk3AU29LU9Y6ZgiJ89mm6HzVJfeCAM8jFoHY8jNqx"
WALLET="5otodEqFggDBBDGfTXVUdd2UCnZJ2amRtcF42PeYv8he"
URL="http://127.0.0.1:8899"
PAYER="/root/.config/solana/id.json"

echo "--- Step 1: Create token account ---"
spl-token create-account "$MINT" \
  --owner "$WALLET" \
  --fee-payer "$PAYER" \
  --url "$URL"

echo "--- Step 2: Get token account address ---"
TOKEN_ACC=$(spl-token accounts --owner "$WALLET" --url "$URL" 2>/dev/null | grep "$MINT" | awk '{print $1}')
echo "Token Account: $TOKEN_ACC"

echo "--- Step 3: Mint 1000 USDC ---"
spl-token mint "$MINT" 1000 "$TOKEN_ACC" \
  --mint-authority "$PAYER" \
  --url "$URL"

echo ""
echo "==========================="
echo "USDC Mint:    $MINT"
echo "Token Acc:    $TOKEN_ACC"
echo "==========================="
echo "Use this USDC Mint in the Create Lottery form:"
echo "$MINT"
