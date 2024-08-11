// First make a async function and appError function then add sign up and login funciton in your work 
// after doing all these thing how you will protect the product and categories in that learn that 

module.exports = fn => {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  };