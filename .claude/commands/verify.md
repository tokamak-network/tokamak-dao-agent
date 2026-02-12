토큰의 DEX 호환성을 종합 검증합니다.

사용자 입력: $ARGUMENTS

## 실행 순서

1. **토큰 식별**: 입력에서 토큰 이름(TON, WTON 등)과 DEX(uniswap, sushiswap 등)를 파악합니다.
   - 토큰 주소 매핑: TON=0x2be5e8c109e2197D077D13A82dAead6a9b3433C5, WTON=0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2

2. **Fork 테스트 실행**: `run_fork_test` 도구를 호출합니다.
   - 토큰이 TON이면: test_pattern="test_TON", contract_pattern="TONCompatibility"
   - 토큰이 WTON이면: test_pattern="test_WTON", contract_pattern="TONCompatibility"
   - 기타: 적절한 패턴 추론

3. **결과 종합**: 검증 결과를 바탕으로 다음을 포함하는 보고서를 작성합니다:
   - 호환성 여부 (가능/불가능)
   - 실패 원인 (revert reason)
   - 근거 (어떤 테스트가 어떤 결과를 보였는지)
   - 권장 사항 (대안이 있다면)

## 중요

- 추측하지 않습니다. 도구 호출 결과만을 근거로 답변합니다.
- fork test 결과를 확인한 후에만 결론을 내립니다.
