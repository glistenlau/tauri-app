import React from "react";

const HightlightText = ({ text }: any) => (
  <span style={{ backgroundColor: "rgba(255, 183, 77, .3)" }}>{text}</span>
);

interface MatchTextProps {
  text: string;
  highlightText: string;
}

const MatchText = ({ text, highlightText }: MatchTextProps): any => {
  const parts = React.useMemo(() => {
    if (!highlightText) {
      return text;
    }

    const lowwer: string = text.toLowerCase();
    const arr = [];
    let left = 0;
    let right = 0;

    while ((right = lowwer.indexOf(highlightText, left)) !== -1) {
      if (left < right) {
        arr.push(text.substring(left, right));
      }
      left = right + highlightText.length;
      arr.push(
        <HightlightText key={right} text={text.substring(right, left)} />
      );
    }

    if (left < text.length) {
      arr.push(text.substring(left));
    }

    return arr;
  }, [highlightText, text]);

  return parts;
};

export default React.memo(MatchText);
