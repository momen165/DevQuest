import styled from '@emotion/styled';

const CopyNotification = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default CopyNotification;