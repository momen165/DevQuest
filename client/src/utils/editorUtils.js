export const getFontClass = (fontFamily) => {
  const fontMap = {
    'Nunito Sans': 'editor-font-nunito',
    'Inter': 'editor-font-inter',
    'Source Sans Pro': 'editor-font-source',
    'Lato': 'editor-font-lato',
    'Open Sans': 'editor-font-opensans',
    'Roboto': 'editor-font-roboto'
  };
  
  return fontMap[fontFamily] || '';
}; 