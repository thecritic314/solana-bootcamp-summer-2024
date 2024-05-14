import { mintTokens } from "./mintTokens";
import { mintNFT } from "./mintNFT";

const main = async () => {
    await mintTokens();
    await mintNFT();
};

main();