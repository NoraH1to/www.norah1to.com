import React, { FC } from 'react';

const Paragraph: FC<{ indent: number }> = ({ indent = 2, children }) => (
  <p style={{ textIndent: `${indent}em` }}>{children}</p>
);

export default Paragraph;
