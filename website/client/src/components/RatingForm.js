import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from 'AuthContext'; // Assuming you use an Auth context
import 'styles/RatingForm.css';

const RatingForm = ({ courseId }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [message, setMessage] = useState('');
    const [hoverRating, setHoverRating] = useState(0); // Added for hover effect
 
    const { user } = useAuth();


    // Handle rating selection
    const handleRating = (star) => setRating(star);

    // Handle hover effects
    const handleMouseEnter = (star) => setHoverRating(star);
    const handleMouseLeave = () => setHoverRating(0);

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent form reload
       setMessage(''); // Clear previous message

        try {
            const feedbackData = {
                course_id: courseId,
                rating,
                comment,
            };

            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'application/json',
                },
            };

            const response = await axios.post(
                'http://localhost:5000/api/feedbackFormStudent',
                feedbackData,
                config
            );

            setMessage('Feedback submitted successfully!');
            setRating(0); // Reset rating
            setComment(''); // Reset comment
        } catch (error) {
            setMessage('Error submitting feedback. Please try again.');
            console.error('Error submitting feedback:', error);
        }
    };

    return (
        <div className="rating-form">
            <p className="rating-title">Rate Course Content</p>
            <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => handleMouseEnter(star)}
                        onMouseLeave={handleMouseLeave}
                    >
                        ★
                    </span>
                ))}
            </div>
            <p className="comment-title">What do you think about this course</p>
            <textarea
                placeholder="Add your comments..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="comment-box"
            />
            <button onClick={handleSubmit} className="submit-button">
                Submit
            </button>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default RatingForm;