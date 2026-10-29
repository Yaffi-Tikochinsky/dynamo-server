-- Member colors moved from bright warm tones to smoky tones that fit the paper design.
-- Each old color is replaced by the new color at the same place in MEMBER_COLORS,
-- so members keep distinct colors and new members are still assigned by usage.
UPDATE "User" SET "color" = CASE "color"
  WHEN '#FFB020' THEN '#B5653A'
  WHEN '#FF6B5A' THEN '#4E6A82'
  WHEN '#FFE27A' THEN '#7A8B5A'
  WHEN '#FF8FB8' THEN '#B0707A'
  WHEN '#F27A3A' THEN '#A87A2E'
  WHEN '#C7E36B' THEN '#4F8A86'
  WHEN '#FFC9A0' THEN '#7E5A7E'
  WHEN '#E8A0FF' THEN '#9C4A3C'
  WHEN '#7FE0C8' THEN '#3F5A48'
  WHEN '#D9A066' THEN '#8C7462'
  ELSE "color"
END;
