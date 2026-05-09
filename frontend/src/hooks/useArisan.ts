import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
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

export function useArisan() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const getProgram = () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      throw new Error('Wallet not connected')
    }
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
    return new Program(idl as any, provider)
  }

  const fetchAllGroups = async (): Promise<GroupInfo[]> => {
    try {
      const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' })
      const program = new Program(idl as any, provider)
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
      const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' })
      const program = new Program(idl as any, provider)
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
      const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' })
      const program = new Program(idl as any, provider)
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

    const tx = await (program.methods as any)
      .initializeGroup(new BN(duesAmount), maxMembers)
      .accounts({
        admin: wallet.publicKey,
        group: groupPda,
        usdcMint: mintPk,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc()
    return tx
  }

  const joinGroup = async (groupAddress: string): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const groupPk = new PublicKey(groupAddress)
    const [repPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    )

    const tx = await (program.methods as any)
      .joinGroup()
      .accounts({
        user: wallet.publicKey,
        group: groupPk,
        reputation: repPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    return tx
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

    const tx = await (program.methods as any)
      .payDues()
      .accounts({
        user: wallet.publicKey,
        group: groupPk,
        userTokenAccount,
        vault: vaultPk,
        reputation: repPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc()
    return tx
  }

  const drawWinner = async (groupAddress: string, group: GroupInfo): Promise<string> => {
    const program = getProgram()
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const groupPk = new PublicKey(groupAddress)
    const vaultPk = new PublicKey(group.vault)
    const mintPk = new PublicKey(group.usdcMint)

    // Pick first eligible (not won) member as the guessed winner for demo
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

    const tx = await (program.methods as any)
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
      })
      .rpc()
    return tx
  }

  return { fetchAllGroups, fetchGroup, fetchReputation, createGroup, joinGroup, payDues, drawWinner }
}
