import styled from "@emotion/styled";
import book2Svg from "icons/book2.svg?raw";
import chatSvg from "icons/chat.svg?raw";
import cogSvg from "icons/cog.svg?raw";
import dieSvg from "icons/die.svg?raw";
import dieBlueSvg from "icons/dieBlue.svg?raw";
import dieOrangeSvg from "icons/dieOrange.svg?raw";
import dieVioletSvg from "icons/dieViolet.svg?raw";
import discordSvg from "icons/discordLogo.svg?raw";
import libraryBooksSvg from "icons/libraryBooks.svg?raw";
import plusSvg from "icons/plus.svg?raw";

const IconSvgs = {
  Plus: plusSvg,
  Discord: discordSvg,
  Cog: cogSvg,
  Chat: chatSvg,
  Die: dieSvg,
  Book2: book2Svg,
  LibraryBooks: libraryBooksSvg,
  DieBlue: dieBlueSvg,
  DieViolet: dieVioletSvg,
  DieOrange: dieOrangeSvg,
};

type IconName = keyof typeof IconSvgs;

// the path data of a material-symbols icon, which is one path in a 24×24 box, for drawing
// it inside another SVG
export const iconPath = (icon: "Chat" | "Cog" | "Die") =>
  /\bd="([^"]+)"/.exec(IconSvgs[icon])?.[1] ?? "";

type IconPropsInternal = { icon: IconName; className?: string; size: number };
export type IconProps = Omit<IconPropsInternal, "icon">;

const IconInternal = ({ icon, className }: IconPropsInternal) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: IconSvgs[icon] }} />
);

const StyledIcon = styled(IconInternal)<{ size: number }>`
  display: inline-flex;

  object-fit: contain;
  width: var(--icon-size, 24px);
  max-width: var(--icon-size, 24px);
  height: var(--icon-size, 24px);
  max-height: var(--icon-size, 24px);

  & svg {
    fill: currentColor;
    stroke: currentColor;
  }
`;

const Icon = Object.fromEntries(
  (Object.keys(IconSvgs) as IconName[]).map((icon) => [
    icon,
    (props: IconProps) => <StyledIcon icon={icon} {...props} />,
  ]),
) as Record<IconName, React.FC<{ className?: string }>>;

export default Icon;
