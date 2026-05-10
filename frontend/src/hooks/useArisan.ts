import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import idl from '../idl/arisan_protocol.json'

const PROGRAM_ID = new PublicKey('81ASx7dk4ijHXKJjkgj2f5K4u8Z2p1kzKtUbUiXZgzex')

export interface MemberStatus {
  wallet: string
  paidCurrentRound: boolean
  hasWon: boolean
}

export interface GroupInfo {
  address: string
  admin: string
  usdcMint: string
  vault: string
  duesAmount: number
  maxMembers: number
  memberCount: number
  currentRound: number
  totalRounds: number
  isActive: boolean
  isLocked: boolean
  members: MemberStatus[]
}

export interface ReputationInfo {
  score: number
  successfulRounds: number
  defaultedRounds: number
  completedGroups: number
}

export interface LotteryParticipant {
  wallet: string
  ticketsBought: number
}

export interface LotteryInfo {
  address: string
  creator: string
  usdcMint: string
  vault: string
  ticketPrice: number
  creatorSharePct: number
  winnerSharesPct: number[]
  endTime: number
  totalTicketsSold: number
  totalPool: number
  participants: LotteryParticipant[]
  isActive: boolean
  winningWallets: string[]
}

export function useArisan() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const anchorWallet = useAnchorWallet()

  const getProgram = () => {
    if (!anchorWallet) throw new Error('Wallet not connected')
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      skipPreflight: true,
    })
    return new Program(idl as any, provider)
  }

  const getReadonlyProgram = () => {
    const dummyWallet = { publicKey: PublicKey.default, signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t }
    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: 'confirmed',
    })
    return new Program(idl as any, provider)
  }

  const sendTx = async (txBuilder: any): Promise<string> => {
    if (!anchorWallet) throw new Error('Wallet not connected')
    const tx = await txBuilder.transaction()
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    tx.recentBlockhash = blockhash
    tx.lastValidBlockHeight = lastValidBlockHeight
    tx.feePayer = anchorWallet.publicKey
    const signed = await anchorWallet.signTransaction(tx)
    const txId = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 10 })
    const result = await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, 'confirmed')
    if (result.value.err) throw new Error('TX failed: ' + JSON.stringify(result.value.err))
    return txId
  }

  // =====================
  // ARISAN GROUP
  // =====================

  const fetchAllGroups = async (): Promise<GroupInfo[]> => {
    try {
      const program = getReadonlyProgram()
      const accounts = await (program.account as any).arisanGroup.all()
      return accounts.map((a: any) => ({
        address: a.publicKey.toBase58(),
        admin: a.account.admin.toBase58(),
        usdcMint: a.account.usdcMint.toBase58(),
        vault: a.account.vault.toBase58(),
        duesAmount: a.account.duesAmount.toNumber(),
        maxMembers: a.account.maxMembers,
        memberCount: a.account.memberCount,
        currentRound: a.account.currentRound,
        totalRounds: a.account.totalRounds,
        isActive: a.account.isActive,
        isLocked: a.account.isLocked,
        members: a.account.members.map((m: any) => ({
          wallet: m.wallet.toBase58(),
          paidCurrentRound: m.paidCurrentRound,
          hasWon: m.hasWon,
        })),
      }))
    } catch (e) {
      console.error('fetchAllGroups', e)
      return []
    }
  }

  const fetchGroup = async (address: string): Promise<GroupInfo | null> => {
    try {
      const program = getReadonlyProgram()
      const pk = new PublicKey(address)
      const a = await (program.account as any).arisanGroup.fetch(pk)
      return {
        address,
        admin: a.admin.toBase58(),
        usdcMint: a.usdcMint.toBase58(),
        vault: a.vault.toBase58(),
        duesAmount: a.duesAmount.toNumber(),
        maxMembers: a.maxMembers,
        memberCount: a.memberCount,
        currentRound: a.currentRound,
        totalRounds: a.totalRounds,
        isActive: a.isActive,
        isLocked: a.isLocked,
        members: a.members.map((m: any) => ({
          wallet: m.wallet.toBase58(),
          paidCurrentRound: m.paidCurrentRound,
          hasWon: m.hasWon,
        })),
      }
    } catch (e) {
      console.error('fetchGroup', e)
      return null
    }
  }

  const fetchReputation = async (userAddress: string): Promise<ReputationInfo | null> => {
    try {
      const program = getReadonlyProgram()
      const user = new PublicKey(userAddress)
      const [repPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('reputation'), user.toBuffer()],
        PROGRAM_ID
      )
      const rep = await (program.account as any).userReputation.fetch(repPda)
      return {
        score: rep.score,
        successfulRounds: rep.successfulRounds,
        defaultedRounds: rep.defaultedRounds,
        completedGroups: rep.completedGroups,
      }
    } catch {
      return null
    }
  }

  const createGroup = async (usdcMint: string, duesAmount: number, maxMembers: number): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const mintPk = new PublicKey(usdcMint)
    const [groupPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('arisan_group'), wallet.publicKey.toBuffer(), Buffer.from([maxMembers])],
      PROGRAM_ID
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), groupPda.toBuffer()],
      PROGRAM_ID
    )

    return sendTx((program.methods as any)
      .initializeGroup(new BN(duesAmount), maxMembers)
      .accounts({
        admin: wallet.publicKey,
        group: groupPda,
        usdcMint: mintPk,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      }))
  }

  const joinGroup = async (groupAddress: string): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const groupPk = new PublicKey(groupAddress)
    const [repPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    )

    return sendTx((program.methods as any)
      .joinGroup()
      .accounts({
        user: wallet.publicKey,
        group: groupPk,
        reputation: repPda,
        systemProgram: SystemProgram.programId,
      }))
  }

  const payDues = async (groupAddress: string, vaultAddress: string, usdcMint: string): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const groupPk = new PublicKey(groupAddress)
    const vaultPk = new PublicKey(vaultAddress)
    const mintPk = new PublicKey(usdcMint)

    const userTokenAccount = await getAssociatedTokenAddress(mintPk, wallet.publicKey)
    const [repPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    )

    return sendTx((program.methods as any)
      .payDues()
      .accounts({
        user: wallet.publicKey,
        group: groupPk,
        userTokenAccount,
        vault: vaultPk,
        reputation: repPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      }))
  }

  const drawWinner = async (groupAddress: string, group: GroupInfo): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const groupPk = new PublicKey(groupAddress)
    const vaultPk = new PublicKey(group.vault)
    const mintPk = new PublicKey(group.usdcMint)

    const eligible = group.members.filter(m => !m.hasWon)
    if (!eligible.length) throw new Error('No eligible members')
    const guessedWinner = new PublicKey(eligible[0].wallet)

    const winnerTokenAccount = await getAssociatedTokenAddress(mintPk, guessedWinner)
    const [winnerRep] = PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), guessedWinner.toBuffer()],
      PROGRAM_ID
    )
    const [lockedPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from('locked_payout'), groupPk.toBuffer(), guessedWinner.toBuffer()],
      PROGRAM_ID
    )

    return sendTx((program.methods as any)
      .drawWinner()
      .accounts({
        admin: wallet.publicKey,
        group: groupPk,
        winnerTokenAccount,
        winnerReputation: winnerRep,
        vault: vaultPk,
        lockedPayout,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }))
  }

  // =====================
  // CREATOR LOTTERY
  // =====================

  const fetchAllLotteries = async (): Promise<LotteryInfo[]> => {
    try {
      const program = getReadonlyProgram()
      const accounts = await (program.account as any).creatorLottery.all()
      return accounts.map((a: any) => ({
        address: a.publicKey.toBase58(),
        creator: a.account.creator.toBase58(),
        usdcMint: a.account.usdcMint.toBase58(),
        vault: a.account.vault.toBase58(),
        ticketPrice: a.account.ticketPrice.toNumber(),
        creatorSharePct: a.account.creatorSharePct,
        winnerSharesPct: Array.from(a.account.winnerSharesPct as Uint8Array),
        endTime: a.account.endTime.toNumber(),
        totalTicketsSold: a.account.totalTicketsSold.toNumber(),
        totalPool: a.account.totalPool.toNumber(),
        participants: a.account.participants.map((p: any) => ({
          wallet: p.wallet.toBase58(),
          ticketsBought: p.ticketsBought.toNumber(),
        })),
        isActive: a.account.isActive,
        winningWallets: a.account.winningWallets.map((w: any) => w.toBase58()),
      }))
    } catch (e) {
      console.error('fetchAllLotteries', e)
      return []
    }
  }

  const initializeLottery = async (
    usdcMint: string,
    ticketPrice: number,
    creatorSharePct: number,
    winnerSharesPct: number[],
    endTimestamp: number
  ): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const mintPk = new PublicKey(usdcMint)
    const endTimeBN = new BN(endTimestamp)

    const [lotteryPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('creator_lottery'),
        wallet.publicKey.toBuffer(),
        endTimeBN.toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    )
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('lottery_vault'), lotteryPda.toBuffer()],
      PROGRAM_ID
    )

    return sendTx((program.methods as any)
      .initializeCreatorLottery(
        new BN(ticketPrice),
        creatorSharePct,
        Buffer.from(winnerSharesPct),
        endTimeBN
      )
      .accounts({
        creator: wallet.publicKey,
        lottery: lotteryPda,
        usdcMint: mintPk,
        vault: vaultPda,
      }))
  }

  const buyLotteryTicket = async (lottery: LotteryInfo, numTickets: number): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const lotteryPk = new PublicKey(lottery.address)
    const vaultPk = new PublicKey(lottery.vault)
    const mintPk = new PublicKey(lottery.usdcMint)
    const buyerTokenAccount = await getAssociatedTokenAddress(mintPk, wallet.publicKey)
    const amountUsdc = lottery.ticketPrice * numTickets

    return sendTx((program.methods as any)
      .buyLotteryTicket(new BN(amountUsdc))
      .accounts({
        buyer: wallet.publicKey,
        lottery: lotteryPk,
        buyerTokenAccount,
        vault: vaultPk,
        tokenProgram: TOKEN_PROGRAM_ID,
      }))
  }

  const drawLottery = async (lottery: LotteryInfo): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const lotteryPk = new PublicKey(lottery.address)
    const vaultPk = new PublicKey(lottery.vault)

    return sendTx((program.methods as any)
      .drawLottery()
      .accounts({
        adminOrCreator: wallet.publicKey,
        lottery: lotteryPk,
        vault: vaultPk,
        tokenProgram: TOKEN_PROGRAM_ID,
      }))
  }

  const claimLotteryPrize = async (lottery: LotteryInfo): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const lotteryPk = new PublicKey(lottery.address)
    const vaultPk = new PublicKey(lottery.vault)
    const mintPk = new PublicKey(lottery.usdcMint)
    const destinationTokenAccount = await getAssociatedTokenAddress(mintPk, wallet.publicKey)

    return sendTx((program.methods as any)
      .claimLotteryPrize()
      .accounts({
        claimer: wallet.publicKey,
        lottery: lotteryPk,
        vault: vaultPk,
        destinationTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      }))
  }

  return {
    fetchAllGroups,
    fetchGroup,
    fetchReputation,
    createGroup,
    joinGroup,
    payDues,
    drawWinner,
    // Lottery
    fetchAllLotteries,
    initializeLottery,
    buyLotteryTicket,
    drawLottery,
    claimLotteryPrize,
  }
}
