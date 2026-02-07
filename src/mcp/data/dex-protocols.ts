/**
 * DEX Protocol metadata for token compatibility verification
 */

export interface DexProtocol {
  name: string;
  routerAddress: `0x${string}`;
  factoryAddress?: `0x${string}`;
  version: string;
  swapAbi: readonly any[];
}

/**
 * Uniswap V2 Router02 - Standard AMM
 */
export const UNISWAP_V2: DexProtocol = {
  name: "Uniswap V2",
  routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  factoryAddress: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  version: "v2",
  swapAbi: [
    {
      name: "swapExactTokensForTokens",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapTokensForExactTokens",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountOut", type: "uint256" },
        { name: "amountInMax", type: "uint256" },
        { name: "path", type: "address[]" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "getAmountsOut",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "path", type: "address[]" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
  ] as const,
};

/**
 * Uniswap V3 SwapRouter - Concentrated liquidity
 */
export const UNISWAP_V3: DexProtocol = {
  name: "Uniswap V3",
  routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  version: "v3",
  swapAbi: [
    {
      name: "exactInputSingle",
      type: "function",
      stateMutability: "payable",
      inputs: [
        {
          name: "params",
          type: "tuple",
          components: [
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMinimum", type: "uint256" },
            { name: "sqrtPriceLimitX96", type: "uint160" },
          ],
        },
      ],
      outputs: [{ name: "amountOut", type: "uint256" }],
    },
    {
      name: "exactOutputSingle",
      type: "function",
      stateMutability: "payable",
      inputs: [
        {
          name: "params",
          type: "tuple",
          components: [
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "amountOut", type: "uint256" },
            { name: "amountInMaximum", type: "uint256" },
            { name: "sqrtPriceLimitX96", type: "uint160" },
          ],
        },
      ],
      outputs: [{ name: "amountIn", type: "uint256" }],
    },
  ] as const,
};

/**
 * Sushiswap Router - Uniswap V2 fork
 */
export const SUSHISWAP: DexProtocol = {
  name: "Sushiswap",
  routerAddress: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  factoryAddress: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
  version: "v2",
  swapAbi: UNISWAP_V2.swapAbi,
};

/**
 * All supported DEX protocols indexed by key
 */
export const DEX_PROTOCOLS: Record<string, DexProtocol> = {
  uniswap_v2: UNISWAP_V2,
  uniswap_v3: UNISWAP_V3,
  sushiswap: SUSHISWAP,
};

/**
 * Common token addresses on Ethereum mainnet
 */
export const COMMON_TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`,
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`,
  DAI: "0x6B175474E89094C44Da98b954EesccdeefC81B4Aa" as `0x${string}`,
  TON: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5" as `0x${string}`,
  WTON: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2" as `0x${string}`,
};

/**
 * ERC20 ABI subset for approvals and balance checks
 */
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Get DEX protocol by name
 */
export function getDexProtocol(key: string): DexProtocol | undefined {
  return DEX_PROTOCOLS[key.toLowerCase().replace(/[\s-]/g, "_")];
}

/**
 * Get all available DEX protocol keys
 */
export function getAvailableDexProtocols(): string[] {
  return Object.keys(DEX_PROTOCOLS);
}
