import React, { useState } from 'react';
import 'styles/RatingForm.css';

const RatingForm = () => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleRating = (value) => {
        setRating(value);
    };

    const handleMouseEnter = (value) => {
        setHoverRating(value);
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    const handleSubmit = () => {
        console.log('Rating:', rating);
        console.log('Comment:', comment);
        // Add submit logic here
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
                onChange={handleCommentChange}
                className="comment-box"
            />
            <button onClick={handleSubmit} className="submit-button">Submit</button>
        </div>
    );
};

export default RatingForm;
