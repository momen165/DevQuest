import React from "react";

const EditorShortcuts = () => {
  const shortcuts = [
    { keys: "Ctrl + Alt + I", description: "Insert Image" },
    { keys: "Ctrl + Alt + J", description: "Insert JavaScript Code Block" },
    { keys: "Ctrl + Alt + P", description: "Insert Python Code Block" },
    { keys: "Ctrl + Alt + H", description: "Insert HTML Code Block" },
    // Add more shortcuts as needed
  ];

  return (
    <div className="editor-shortcuts">
      <h3>Keyboard Shortcuts</h3>
      <ul>
        {shortcuts.map((shortcut, index) => (
          <li key={index}>
            <kbd>{shortcut.keys}</kbd> - {shortcut.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EditorShortcuts;
