Comprehensively verify a token's DEX compatibility.

User input: $ARGUMENTS

## Execution Order

1. **Identify token**: Extract the token name (TON, WTON, etc.) and DEX (uniswap, sushiswap, etc.) from the input.
   - Token address mapping: TON=0x2be5e8c109e2197D077D13A82dAead6a9b3433C5, WTON=0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2
   - DEX mapping: uniswap=uniswap_v2, uniswap v3=uniswap_v3, sushiswap=sushiswap

2. **Run MCP verification**: Call the `test_token_transfer` tool.
   - token_address: The address mapped above
   - dex: The DEX key mapped above
   - scenarios: ["approve", "transferFrom", "swap"] (run all)

3. **Run fork test**: Call the `run_fork_test` tool.
   - If token is TON: test_pattern="test_TON", contract_pattern="TONCompatibility"
   - If token is WTON: test_pattern="test_WTON", contract_pattern="TONCompatibility"
   - Otherwise: infer appropriate patterns

4. **Summarize results**: Compile both verification results into a report that includes:
   - Compatibility status (possible/not possible)
   - Failure cause (revert reason)
   - Evidence (which tests produced which results)
   - Recommendations (alternatives if available)

## Important

- Do not speculate. Answer based only on tool call results.
- Only draw conclusions after running both tools.
