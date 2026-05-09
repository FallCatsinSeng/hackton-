const anchor = require("@coral-xyz/anchor");
const { BN, web3 } = anchor;

async function main() {
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load CLI wallet as signer
  const fs = require("fs");
  const secret = JSON.parse(fs.readFileSync("/root/.config/solana/id.json"));
  const keypair = web3.Keypair.fromSecretKey(new Uint8Array(secret));
  
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed", skipPreflight: true });
  anchor.setProvider(provider);
  
  const idl = JSON.parse(fs.readFileSync("/workspace/arisan_protocol/target/idl/arisan_protocol.json"));
  const program = new anchor.Program(idl, provider);
  
  const USDC_MINT = new web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const endTimeBN = new BN(endTime);
  
  const [lotteryPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("creator_lottery"), keypair.publicKey.toBuffer(), endTimeBN.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  
  const [vaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_vault"), lotteryPda.toBuffer()],
    program.programId
  );
  
  console.log("Creator:", keypair.publicKey.toBase58());
  console.log("Lottery PDA:", lotteryPda.toBase58());
  console.log("Vault PDA:", vaultPda.toBase58());
  console.log("endTime:", endTime);
  
  try {
    const tx = await program.methods
      .initializeCreatorLottery(
        new BN(100000), // 0.1 USDC
        35,
        Buffer.from([35, 15, 10, 5]),
        endTimeBN
      )
      .accounts({
        creator: keypair.publicKey,
        lottery: lotteryPda,
        usdcMint: USDC_MINT,
        vault: vaultPda,
      })
      .rpc({ skipPreflight: false, commitment: "confirmed" });
    
    console.log("SUCCESS! TX:", tx);
  } catch (e) {
    console.error("ERROR:", e.message);
    if (e.logs) {
      console.error("LOGS:", e.logs.join("\n"));
    }
  }
}

main().catch(console.error);
