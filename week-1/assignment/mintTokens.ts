import { 
    Keypair, 
    PublicKey, 
    SystemProgram, 
    Transaction, 
    TransactionInstruction, 
    sendAndConfirmTransaction 
} from "@solana/web3.js";
import { payer, connection } from "@/lib/vars";
import { 
    MINT_SIZE, 
    TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction, 
    createMintToInstruction, 
    createAssociatedTokenAccountInstruction, 
    getAssociatedTokenAddressSync 
} from "@solana/spl-token";
import {
    PROGRAM_ID as METADATA_PROGRAM_ID,
    createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";


const sendToken = async (mintKeypair: Keypair): Promise<TransactionInstruction[]> => {
    const ATA_1 = getAssociatedTokenAddressSync(mintKeypair.publicKey, payer.publicKey);
    const createATAIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ATA_1,
        payer.publicKey,
        mintKeypair.publicKey
    )
    // mint 100 to account
    const mint100TokenIx = createMintToInstruction(
        mintKeypair.publicKey,
        ATA_1,
        payer.publicKey,
        100_000_000
    )

    // mint 10 to 63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs 
    const add_2 = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
    const ATA_2 = getAssociatedTokenAddressSync(mintKeypair.publicKey, add_2);
    const createATA_2Ix = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ATA_2,
        add_2,
        mintKeypair.publicKey
    )

    // mint instruction
    const mint10TokenIx = createMintToInstruction(
        mintKeypair.publicKey,
        ATA_2,
        payer.publicKey,
        10_000_000,
    )

    return [
        createATAIx,
        mint100TokenIx,
        createATA_2Ix,
        mint10TokenIx
    ]
}

export const mintTokens = async () => {
    const mintKeypair = Keypair.generate();
    const instructions = await mintTokenIx(mintKeypair);
    const sendTokenInstructions = await sendToken(mintKeypair);
    const transaction = new Transaction();
    transaction.add(...instructions);
    transaction.add(...sendTokenInstructions);

    const signature = await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    console.log("Transaction signature:", signature);
}

const mintTokenIx = async (mintKeypair: Keypair): Promise<TransactionInstruction[]> => {
    console.log("Payer address:", payer.publicKey.toBase58());

    // generate a new keypair to be used for our mint
    console.log("Mint address:", mintKeypair.publicKey.toBase58());

    const tokenConfig = {
        // define how many decimals we want our tokens to have
        decimals: 6,
        //
        name: "Token Mint",
        //
        symbol: "TM",
        //
        uri: "https://raw.githubusercontent.com/trankhacvy/solana-bootcamp-summer-2024/main/assets/sbs-token.json",
    };

    // create instruction for the token mint account
    const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        // the `space` required for a token mint is accessible in the `@solana/spl-token` sdk
        space: MINT_SIZE,
        // store enough lamports needed for our `space` to be rent exempt
        lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
        // tokens are owned by the "token program"
        programId: TOKEN_PROGRAM_ID,
    });

    // Initialize that account as a Mint
    const initializeMintIx = createInitializeMint2Instruction(
        mintKeypair.publicKey,
        tokenConfig.decimals,
        payer.publicKey,
        payer.publicKey,
    );

    // derive the pda address for the Metadata account
    const metadataAccount = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        METADATA_PROGRAM_ID,
    )[0];

    // Create the Metadata account for the Mint
    const createMetadataIx = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    creators: null,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    uri: tokenConfig.uri,
                    sellerFeeBasisPoints: 0,
                    collection: null,
                    uses: null,
                },
                // `collectionDetails` - for non-nft type tokens, normally set to `null` to not have a value set
                collectionDetails: null,
                // should the metadata be updatable?
                isMutable: true,
            },
        },
    );

    // return the instructions
    return [
        createMintAccountIx,
        initializeMintIx,
        createMetadataIx,
    ]
};