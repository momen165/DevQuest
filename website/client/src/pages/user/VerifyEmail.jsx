import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const verificationAttempted = useRef(false);

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            // Prevent multiple verification attempts
            if (verificationAttempted.current) {
                return;
            }
            verificationAttempted.current = true;

            if (!token) {
                setStatus('error');
                setMessage('Invalid or missing verification token.');
                return;
            }

            try {
                const response = await axios.get(`/api/verify-email`, {
                    params: { token }
                });
                setStatus('success');
                setMessage(response.data.message);
                // Auto-redirect to login after successful verification
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (error) {
                setStatus('error');
                let errorMessage = 'An error occurred while verifying your email.';
                
                if (error.response?.data?.error === 'Token has expired') {
                    errorMessage = 'Your verification link has expired. Please request a new one.';
                } else if (error.response?.data?.error === 'Email already verified') {
                    errorMessage = 'Your email is already verified. You can proceed to login.';
                    // Auto-redirect to login for already verified emails
                    setTimeout(() => {
                        navigate('/loginPage');
                    }, 3000);
                } else if (error.response?.data?.error) {
                    errorMessage = error.response.data.error;
                }
                
                setMessage(errorMessage);
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    const handleRedirect = () => {
        navigate('/loginPage');
    };

    const handleResendVerification = async () => {
        // TODO: Implement resend verification email functionality
        console.log('Resend verification clicked');
    };

    return (
        <div style={styles.container}>
            {status === 'loading' && (
                <div>
                    <h2 style={styles.loading}>Verifying Your Email</h2>
                    <p>Please wait while we verify your email address...</p>
                </div>
            )}
            {status === 'success' && (
                <div>
                    <h2 style={styles.success}>Email Verified Successfully!</h2>
                    <p>{message}</p>
                    <p style={styles.redirectMessage}>
                        Redirecting to login page in a few seconds...
                    </p>
                    <button onClick={handleRedirect} style={styles.button}>
                        Go to Login Now
                    </button>
                </div>
            )}
            {status === 'error' && (
                <div>
                    <h2 style={styles.error}>
                        {message.includes('already verified') ? 'Email Status' : 'Verification Failed'}
                    </h2>
                    <p>{message}</p>
                    {message.includes('already verified') && (
                        <p style={styles.redirectMessage}>
                            Redirecting to login page in a few seconds...
                        </p>
                    )}
                    <div style={styles.buttonContainer}>
                        <button onClick={handleRedirect} style={styles.button}>
                            {message.includes('already verified') ? 'Go to Login Now' : 'Back to Sign Up'}
                        </button>
                        {!message.includes('already verified') && !message.includes('expired') && (
                            <button onClick={handleResendVerification} style={styles.secondaryButton}>
                                Resend Verification Email
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
    },
    loading: {
        color: '#4F46E5',
        marginBottom: '20px',
    },
    success: {
        color: '#059669',
        marginBottom: '20px',
    },
    error: {
        color: '#DC2626',
        marginBottom: '20px',
    },
    redirectMessage: {
        color: '#6B7280',
        fontStyle: 'italic',
        marginTop: '10px',
    },
    button: {
        marginTop: '20px',
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#4F46E5',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        ':hover': {
            backgroundColor: '#4338CA',
        },
    },
    buttonContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '20px',
    },
    secondaryButton: {
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: 'transparent',
        color: '#4F46E5',
        border: '2px solid #4F46E5',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
            backgroundColor: '#EEF2FF',
        },
    }
};

export default VerifyEmail;
