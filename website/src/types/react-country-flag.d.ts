declare module 'react-country-flag' {
  import { ComponentType, CSSProperties } from 'react';

  export interface ReactCountryFlagProps {
    countryCode: string;
    svg?: boolean;
    style?: CSSProperties;
    title?: string;
    className?: string;
    cdnUrl?: string;
    cdnSuffix?: string;
    alt?: string;
  }

  const ReactCountryFlag: ComponentType<ReactCountryFlagProps>;
  export default ReactCountryFlag;
}

