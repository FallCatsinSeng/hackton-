const anchor = require("@coral-xyz/anchor");
const { BN, web3 } = anchor;
const fs = require("fs");

async function main() {
  const conn = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  const secret = JSON.parse(fs.readFileSync("/root/.config/solana/id.json"));
  const payer = web3.Keypair.fromSecretKey(new Uint8Array(secret));
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: "confirmed" });
  const idl = JSON.parse(fs.readFileSync("/workspace/arisan_protocol/target/idl/arisan_protocol.json"));
  const program = new anchor.Program(idl, provider);

  const USDC_MINT = new web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const endTime = Math.floor(Date.now() / 1000) + 7200;
  const endTimeBN = new BN(endTime);

  const [lotteryPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("creator_lottery"), payer.publicKey.toBuffer(), endTimeBN.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const [vaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_vault"), lotteryPda.toBuffer()],
    program.programId
  );

  // Build TX via .transaction() — same as frontend
  const tx = await program.methods
    .initializeCreatorLottery(
      new BN(300000),
      43,
      Buffer.from([35, 15, 7]),
      endTimeBN
    )
    .accounts({
      creator: payer.publicKey,
      lottery: lotteryPda,
      usdcMint: USDC_MINT,
      vault: vaultPda,
    })
    .transaction();

  console.log("TX instructions:", tx.instructions.length);
  tx.instructions.forEach((ix, i) => {
    console.log("IX", i, "program:", ix.programId.toBase58());
    ix.keys.forEach((k, j) => {
      console.log("  ["+j+"]", k.pubkey.toBase58(), k.isSigner?"S":"", k.isWritable?"W":"");
    });
  });

  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  const sim = await conn.simulateTransaction(tx);
  console.log("\nSimulation err:", JSON.stringify(sim.value.err));
  if (sim.value.logs) sim.value.logs.forEach(l => console.log(" ", l));
}
main().catch(e => console.error("FATAL:", e.message));
