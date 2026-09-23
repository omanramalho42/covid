import React from 'react'
import {
  Typography,
  Card,
  CardContent
} from '@mui/material'

import './InfoBox.css'

const InfoBox = ({ title, cases, active, isRed, total, onClick }) => {

  return (
    <Card
      onClick={onClick}
      // Correção: usar ternário em vez de "&&" para não injetar a string "false" na className
      className={`infoBox ${active ? 'infoBox--selected' : ''} ${isRed ? 'infoBox--red' : ''}`}
    >
      <CardContent>
        <Typography className="infoBox__title" color="textSecondary">
          {title}
        </Typography>
        <h2 className={`infoBox__cases ${!isRed ? "infoBox__cases--green" : ""}`}>
          {cases}
        </h2>
        <Typography className="infoBox__total" color="textSecondary">
          {total} Total
        </Typography>
      </CardContent>
    </Card>
  )
}

export default InfoBox