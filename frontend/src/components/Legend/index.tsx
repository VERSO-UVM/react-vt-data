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
      <h2>Legend Table</h2>
      <table>
        <tr>
          {' '}
          <th style={{ paddingRight: '15px' }}>
            {test_brackets[0]
              ?.split(/:\s*/)[0]
              ?.replaceAll('\"', '')
              ?.replaceAll('\{', '')}{' '}
          </th>
          <th>Color</th>
        </tr>

        {test_brackets.map((items_in_jsons, index) => (
          <tr key={index}>
            <td style={{ paddingRight: '15px' }}>
              {items_in_jsons
                ?.split(/,\s*/)[0]
                ?.split(/:\s*/)[1]
                ?.replaceAll('"', '')}
            </td>
            <td>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: items_in_jsons
                    ?.split(/,\s*/)[1]
                    ?.split(/:\s*/)[1]
                    ?.replaceAll('"', ''),
                  // for some reason sometimes the above line does not work. I believe this is because the previous split does not
                  // fully happen before the next split starts (or something like that), which is why i added the optional chaining
                  // backgroundColor: 'blue',
                  width: '20px',
                  height: '10px',
                }}
              ></span>
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
