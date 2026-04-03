# 생성과 평가 분리 가이드 (원칙 3)

> 에이전트에게 자기 작업을 평가하게 하면 편향이 생긴다.
> 독립된 Evaluator를 "회의적"으로 튜닝하는 것이 Generator를 자기비판적으로 만드는 것보다 훨씬 쉽다.

## 핵심 원칙

- **Generator**: 코드/기능 작성
- **Evaluator**: 작성된 결과만 평가, 작성 과정 모름

두 역할은 **반드시 다른 인스턴스**에서 실행한다.

---

## 적용 시나리오

### PR 리뷰
```
❌ 잘못된 방식: 코드 작성한 에이전트에게 "이 코드 리뷰해줘"
✅ 올바른 방식: 새 인스턴스에 아래 skeptical-review 스킬로 리뷰 요청
```

### WebRTC 변경 시 체크리스트
새 인스턴스에게 아래 항목만 검토 요청:
- [ ] RTCPeerConnection이 useState가 아닌 useRef로 관리되는가?
- [ ] cleanup 함수 (pc.close() + peers.delete())가 있는가?
- [ ] offer/answer/ICE 순서가 시그널링 흐름과 일치하는가?
- [ ] 메모리 누수 가능성이 있는가?

### 기능 구현 후
새 인스턴스에게 아래 질문만 던진다:
> "이 코드의 문제점과 위험 요소만 찾아라. 좋은 점은 생략해도 좋다."

---

## skeptical-review 스킬 사용법

```
/skeptical-review
```

또는 code-reviewer 에이전트 직접 호출:
```
oh-my-claudecode:code-reviewer (model=opus)
프롬프트: "이 PR의 문제점만 찾아라. 좋은 점은 생략해도 좋다."
```
