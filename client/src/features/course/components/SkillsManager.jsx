const SkillsManager = ({ skills, newSkill, setNewSkill, onAddSkill, onRemoveSkill }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddSkill();
    }
  };

  return (
    <div className="skills-container">
      <div className="skills-wrapper">
        {skills.split(",").map(
          (skill, index) =>
            skill.trim() && (
              <div key={`${skill.trim()}-${index}`} className="skill-badge">
                {skill.trim()}
                <span className="skill-remove-icon" onClick={() => onRemoveSkill(index)}>
                  x
                </span>
              </div>
            )
        )}
      </div>
      <div className="skill-input-container">
        <input
          type="text"
          className="skill-input"
          placeholder="Add a skill..."
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="add-skill-btn" onClick={onAddSkill}>
          +
        </button>
      </div>
    </div>
  );
};

export default SkillsManager;
