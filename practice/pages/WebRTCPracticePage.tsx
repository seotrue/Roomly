'use client';

import { useRef, useState } from 'react';
import { useMediaPractice } from '../hooks/useMediaPractice';
import { useWebRTCPractice } from '../hooks/useWebRTCPractice';

// ─────────────────────────────────────────────────────────────────────────────
// WebRTCPracticePage
//
// 역할: WebRTC 연습용 페이지 컴포넌트
//
// 사용법:
// 1. 브라우저 2개(또는 탭 2개)에서 이 페이지 열기
// 2. 양쪽 모두 "카메라 켜기" → "PeerConnection 생성" 클릭
// 3. 한쪽(Alice)에서 "Offer 생성" → 복사
// 4. 다른 쪽(Bob)에 붙여넣기 → "Offer 받기" → "Answer 생성" → 복사
// 5. Alice에 Answer 붙여넣기 → "Answer 받기"
// 6. 연결 완료! 🎉
// ─────────────────────────────────────────────────────────────────────────────

export default function WebRTCPracticePage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Step 1: 미디어 스트림 획득
  const { localStream, error: mediaError } = useMediaPractice();

  // Step 2-5: WebRTC 연결 관리
  const {
    remoteStream,
    connectionState,
    offer,
    answer,
    createPeerConnection,
    createOffer,
    receiveOffer,
    createAnswer,
    receiveAnswer,
    cleanup,
  } = useWebRTCPractice({ localStream });

  // 입력 필드 state
  const [offerInput, setOfferInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');

  // 로컬 비디오 연결
  if (localVideoRef.current && localStream) {
    localVideoRef.current.srcObject = localStream;
  }

  // 원격 비디오 연결
  if (remoteVideoRef.current && remoteStream) {
    remoteVideoRef.current.srcObject = remoteStream;
  }

  // Offer 복사
  const copyOffer = () => {
    navigator.clipboard.writeText(offer);
    alert('📋 Offer가 복사되었습니다!');
  };

  // Answer 복사
  const copyAnswer = () => {
    navigator.clipboard.writeText(answer);
    alert('📋 Answer가 복사되었습니다!');
  };

  // Offer 받기 핸들러
  const handleReceiveOffer = async () => {
    await receiveOffer(offerInput);
  };

  // Answer 받기 핸들러
  const handleReceiveAnswer = async () => {
    await receiveAnswer(answerInput);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>🎥 WebRTC 연습 (React + TypeScript)</h1>
      
      <div style={{
        background: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #2196f3'
      }}>
        <strong>📚 학습 목표:</strong> React hooks로 WebRTC 구현하기
        <br /><br />
        <strong>💡 사용 방법:</strong>
        <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li>이 페이지를 브라우저 <strong>2개</strong>에서 열기</li>
          <li>양쪽 모두: "카메라 켜기" (자동) → "PeerConnection 생성" 클릭</li>
          <li>Alice(탭 1): "Offer 생성" → "Offer 복사"</li>
          <li>Bob(탭 2): Offer 붙여넣기 → "Offer 받기" → "Answer 생성" → "Answer 복사"</li>
          <li>Alice(탭 1): Answer 붙여넣기 → "Answer 받기"</li>
          <li>연결 완료! 서로의 영상이 보입니다 🎉</li>
        </ol>
      </div>

      {/* 에러 표시 */}
      {mediaError && (
        <div style={{
          background: '#ffebee',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#c62828',
          borderLeft: '4px solid #f44336'
        }}>
          ❌ 에러: {mediaError}
        </div>
      )}

      {/* ==================== STEP 1: 미디어 획득 ==================== */}
      <section style={{
        background: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
          📹 STEP 1: 카메라/마이크 획득 {localStream ? '✅' : '⏳'}
        </h2>
        
        <div style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '15px',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#e65100' }}>✍️ TODO 1:</strong>
          <p style={{ marginTop: '10px' }}>
            <code style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              color: '#d32f2f'
            }}>
              practice/hooks/useMediaPractice.ts
            </code> 파일을 열어서 TODO를 완성하세요!
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginTop: '20px'
        }}>
          {/* 내 영상 */}
          <div style={{
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              내 영상 (Local)
            </div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* 상대방 영상 */}
          <div style={{
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              상대방 영상 (Remote)
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>

        <p style={{ marginTop: '15px', color: '#666' }}>
          상태: {localStream ? '✅ 카메라/마이크 활성화' : '⏳ 미디어 획득 중...'}
        </p>
      </section>

      {/* ==================== STEP 2: PeerConnection 생성 ==================== */}
      <section style={{
        background: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
          🔗 STEP 2: PeerConnection 생성
        </h2>
        
        <div style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '15px',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#e65100' }}>✍️ TODO 2:</strong>
          <p style={{ marginTop: '10px' }}>
            <code style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              color: '#d32f2f'
            }}>
              practice/hooks/useWebRTCPractice.ts
            </code> 파일의 TODO 2-1, 2-2, 2-3을 완성하세요!
          </p>
        </div>

        <button
          onClick={createPeerConnection}
          disabled={!localStream}
          style={{
            background: localStream ? '#2196f3' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: localStream ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          PeerConnection 생성
        </button>

        <p style={{ marginTop: '15px', color: '#666' }}>
          연결 상태: <strong>{connectionState}</strong>
        </p>
      </section>

      {/* ==================== STEP 3: Offer 생성 ==================== */}
      <section style={{
        background: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
          📤 STEP 3: Offer 생성 (연결 시작하는 쪽)
        </h2>
        
        <div style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '15px',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#e65100' }}>✍️ TODO 3:</strong>
          <p style={{ marginTop: '10px' }}>
            <code style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              color: '#d32f2f'
            }}>
              practice/hooks/useWebRTCPractice.ts
            </code> 파일의 TODO 3-1, 3-2를 완성하세요!
          </p>
        </div>

        <button
          onClick={createOffer}
          style={{
            background: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          Offer 생성
        </button>

        <button
          onClick={copyOffer}
          disabled={!offer}
          style={{
            background: offer ? '#ff9800' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: offer ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
        >
          Offer 복사
        </button>

        {offer && (
          <textarea
            readOnly
            value={offer}
            style={{
              width: '100%',
              height: '100px',
              marginTop: '15px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        )}
      </section>

      {/* ==================== STEP 4: Offer 받기 & Answer 생성 ==================== */}
      <section style={{
        background: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
          📥 STEP 4: Offer 받기 & Answer 생성
        </h2>
        
        <div style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '15px',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#e65100' }}>✍️ TODO 4:</strong>
          <p style={{ marginTop: '10px' }}>
            <code style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              color: '#d32f2f'
            }}>
              practice/hooks/useWebRTCPractice.ts
            </code> 파일의 TODO 4-1, 4-2, 4-3, 4-4를 완성하세요!
          </p>
        </div>

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          상대방의 Offer 붙여넣기:
        </label>
        <textarea
          value={offerInput}
          onChange={(e) => setOfferInput(e.target.value)}
          placeholder="여기에 상대방의 Offer를 붙여넣으세요..."
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '15px'
          }}
        />

        <button
          onClick={handleReceiveOffer}
          disabled={!offerInput}
          style={{
            background: offerInput ? '#2196f3' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: offerInput ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          Offer 받기
        </button>

        <button
          onClick={createAnswer}
          style={{
            background: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          Answer 생성
        </button>

        <button
          onClick={copyAnswer}
          disabled={!answer}
          style={{
            background: answer ? '#ff9800' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: answer ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
        >
          Answer 복사
        </button>

        {answer && (
          <textarea
            readOnly
            value={answer}
            style={{
              width: '100%',
              height: '100px',
              marginTop: '15px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        )}
      </section>

      {/* ==================== STEP 5: Answer 받기 ==================== */}
      <section style={{
        background: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
          ✅ STEP 5: Answer 받기 (연결 완료)
        </h2>
        
        <div style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '15px',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <strong style={{ color: '#e65100' }}>✍️ TODO 5:</strong>
          <p style={{ marginTop: '10px' }}>
            <code style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: '3px',
              color: '#d32f2f'
            }}>
              practice/hooks/useWebRTCPractice.ts
            </code> 파일의 TODO 5-1, 5-2를 완성하세요!
          </p>
        </div>

        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          상대방의 Answer 붙여넣기:
        </label>
        <textarea
          value={answerInput}
          onChange={(e) => setAnswerInput(e.target.value)}
          placeholder="여기에 상대방의 Answer를 붙여넣으세요..."
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '15px'
          }}
        />

        <button
          onClick={handleReceiveAnswer}
          disabled={!answerInput}
          style={{
            background: answerInput ? '#4caf50' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: answerInput ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
        >
          Answer 받기
        </button>
      </section>

      {/* 완료 메시지 */}
      {connectionState === 'connected' && (
        <div style={{
          background: '#e8f5e9',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '18px',
          color: '#2e7d32',
          borderLeft: '4px solid #4caf50'
        }}>
          🎉 연결 완료! WebRTC P2P 통신이 성공적으로 이루어지고 있습니다!
        </div>
      )}

      {/* 정리 버튼 */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={cleanup}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          연결 종료 & 정리
        </button>
      </div>

      {/* 힌트 */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '10px' }}>💡 개발자 도구 Console을 확인하세요!</h3>
        <p>F12를 눌러서 Console 탭을 열면 각 단계별 로그를 확인할 수 있습니다.</p>
        <p style={{ marginTop: '10px' }}>
          막혔을 때는 <code style={{
            background: '#fff',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>practice/hooks/*-answer.ts</code> 정답 파일을 참고하세요!
        </p>
      </div>
    </div>
  );
}
