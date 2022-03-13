import React, { FC } from 'react';

const TextSecondary: FC<{ italic: boolean }> = ({
  italic = true,
  children,
}) => (
  <small style={{ opacity: 0.5 }}>
    {italic ? <i>{children}</i> : children}
  </small>
);

export default TextSecondary;
