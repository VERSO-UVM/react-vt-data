'use client';
import React from 'react';

interface LegendTable {
  legend_header: string;
  hex_color: string;
  rgba: string;
  test: string;
}

export default function MapLegend({
  legend_header = 'null',
  hex_color = 'null',
  rgba = '[0,0,0,0]',
  test = 'testing',
}: LegendTable) {
  // super basic for loop below. will modify
  // 1. Define your array of data
  const fruits = ['Apple', 'Banana', 'Orange', 'Mango'];

  const test_brackets = test.split(/},\s*/);
  // const legend_string = JSON.parse(test_brackets);
  console.log(test_brackets); //I am confused why this prints null
  // for (const [key, value] of Object.entries(legend_string)) {
  //   console.log(`${key}: ${value}`);
  // }
  // console.log(test)
  // same with this part
  {
    test_brackets.map((items_in_jsons, index) =>
      console.log({ items_in_jsons }),
    );
  }

  return (
    <div>
      <h2>Legend</h2>
      <ul>
        <li>
          {test_brackets[0]
            .split(/:\s*/)[0]
            .replaceAll('\"', '')
            .replaceAll('\{', '')}{' '}
          | Color
        </li>

        {test_brackets.map((items_in_jsons, index) => (
          <li key={index}>
            {items_in_jsons.split(/,\s*/)[0].split(/:\s*/)[1]},{' '}
            <span
              style={{
                display: 'inline-block',
                backgroundColor: items_in_jsons
                  .split(/,\s*/)[1]
                  .split(/:\s*/)[1]
                  .replaceAll('"', ''),
                // backgroundColor: 'blue', for some reason sometimes the above line does not work
                width: '20px',
                height: '10px',
              }}
            ></span>
          </li>
          // <li key={index}>{items_in_jsons}</li>
        ))}
      </ul>
    </div>
  );
}
