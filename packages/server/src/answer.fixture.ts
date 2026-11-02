export const answer = (content = 'Welcome, traveller!') => {
  return Response.json({ message: { content }, done: true });
};
