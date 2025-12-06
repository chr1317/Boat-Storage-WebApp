module.exports = function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),       
    clearCookie: jest.fn().mockReturnThis(), 
    end: jest.fn().mockReturnThis(),         
    sendStatus: jest.fn().mockReturnThis(),   
  };
};
