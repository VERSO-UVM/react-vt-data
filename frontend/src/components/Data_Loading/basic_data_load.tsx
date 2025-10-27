import { useEffect } from 'react';

function BDLoad() {
  useEffect(() => {
    fetch('http://127.0.0.1:6767/load/census/housing/median_home_value', {
      method: 'POST', // when we code full version, this should be based on the dataset that we are querying
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  return null;
}

export default BDLoad;
