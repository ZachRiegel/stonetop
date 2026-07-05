import _ from "lodash";

const discordProfilePictureForUser = ({ id, picture }: { id: string; picture?: string | null }) => {
  const numericId = Number(_.last(id.split(/\|/g)));
  if (!picture || (picture.match(/gravatar/) && id.match(/discord/))) {
    return `https://cdn.discordapp.com/embed/avatars/${(numericId >> 22) % 6}.png`;
  }

  return picture;
};

export default discordProfilePictureForUser;
