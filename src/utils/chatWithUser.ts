import { User } from "../models/user.model";
import { deletePrefixedId } from "../utils/prefix";

export const chatWithUser = async (usersId: string[]) => {
  const users = await User.find({ id: { $in: usersId } });
  const usersData = users.map((user) => {
    return {
      id: deletePrefixedId(user.id),
      username: user.name,
      picture: user.picture,
    };
  });

  return usersData;
};
