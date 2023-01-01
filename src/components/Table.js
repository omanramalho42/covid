import React from 'react'
import numeral from 'numeral'
import './Table.css'

const Table = ({ countries }) => {
  return (
    <div className='table'>
      {countries?.map(({ country, cases }, idx) => (
        <tr key={idx}>
          <td>{ country }</td>
          <td>
            <strong>{ numeral(cases).format("") }</strong>
          </td>
        </tr>
      ))}
    </div>
  )
}

export default Table