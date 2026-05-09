#!/bin/bash
# Quick setup script for hackathon demo
# Run: bash setup_demo.sh <your_wallet_address>

WALLET=$1

if [ -z "$WALLET" ]; then
  echo "Usage: bash setup_demo.sh <your_brave_wallet_address>"
  echo ""
  echo "To find your Brave Wallet address:"
  echo "  1. Open Brave Wallet"
  echo "  2. Click account name -> Copy Address"
  exit 1
fi

echo "=== Arisan Protocol Demo Setup ==="
echo "Wallet: $WALLET"
echo ""

# Airdrop SOL
echo "1. Airdropping 100 SOL..."
docker exec -i arisan-dev bash -c "solana airdrop 100 $WALLET --url http://127.0.0.1:8899"

# Create USDC mint
echo ""
echo "2. Creating mock USDC mint..."
MINT=$(docker exec -i arisan-dev bash -c "
  spl-token create-token --decimals 6 --url http://127.0.0.1:8899 2>&1 | grep 'Address:' | awk '{print \$2}'
")
echo "   USDC Mint: $MINT"

# Create token account for wallet
echo ""
echo "3. Creating token account for your wallet..."
docker exec -i arisan-dev bash -c "
  spl-token create-account $MINT --owner $WALLET --url http://127.0.0.1:8899
"

# Mint some USDC to wallet
echo ""
echo "4. Minting 100 USDC to your wallet..."
docker exec -i arisan-dev bash -c "
  spl-token mint $MINT 100 --url http://127.0.0.1:8899 -- \$(spl-token accounts --owner $WALLET --url http://127.0.0.1:8899 | grep $MINT | awk '{print \$1}')
"

echo ""
echo "=== SETUP COMPLETE ==="
echo "USDC Mint Address: $MINT"
echo ""
echo "Use this USDC Mint Address in the Create Lottery form!"
echo "Copy this: $MINT"
